import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const ids=Object.fromEntries(['super','editor','reviewer','publisher','learner','unverified'].map(k=>[k,crypto.randomUUID()]));
const q=async(s,a=[]) => (await db.query(s,a)).rows;
const rpc=async(f,a=[]) => (await q(`select public.${f}(${a.map((_,i)=>'$'+(i+1)).join(',')}) result`,a))[0].result;
async function as(k,role='authenticated'){await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[ids[k]??'']);await db.exec(`set role ${role}`);}
let course,lesson,version;
const body={text:'Grammar explanation',explanationJa:'これは{本|ほん}です。',explanationEn:'This is a book.',examples:[{japanese:'これは{本|ほん}です。',english:'This is a book.'},{japanese:'これは{水|みず}です。',english:'This is water.'}],richText:[{type:'heading',text:'Grammar notes'}]};
before(async()=>{
 await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,created_at timestamptz default now(),raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;");
 for(const f of fs.readdirSync('supabase/migrations').sort()) await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 for(const [k,id] of Object.entries(ids)) await q('insert into auth.users(id,email,email_confirmed_at) values($1,$2,$3)',[id,k+'@example.test',k==='unverified'?null:new Date().toISOString()]);
 await q('select private.cms_bootstrap($1)',[ids.super]);
 await as('super');for(const [k,r] of [['editor','content_editor'],['reviewer','content_reviewer'],['publisher','content_admin']])await rpc('cms_assign_role',[ids[k],r]);
 await db.exec('reset role');course=(await q("select id from public.courses where slug='n5'"))[0].id;
});
after(async()=>{try{await as('editor');fs.mkdirSync('outputs',{recursive:true});fs.writeFileSync('outputs/task13-cms-visual-fixture.json',JSON.stringify({workspace:await rpc('cms_document',['lesson',lesson]),references:await rpc('cms_references')}));}finally{await db.close();}});
test('anonymous, ordinary and unverified users cannot read or mutate CMS',async()=>{
 await as('', 'anon');await assert.rejects(rpc('cms_dashboard'));
 for(const k of ['learner','unverified']){await as(k);assert.equal((await rpc('cms_session')).role,null);await assert.rejects(rpc('cms_dashboard'));await assert.rejects(rpc('cms_assign_role',[ids[k],'super_admin']));}
});
test('content roles never acquire legacy platform administration or role assignment',async()=>{for(const k of ['editor','reviewer','publisher']){await as(k);assert.equal(await rpc('is_admin'),false);await assert.rejects(rpc('cms_assign_role',[ids.learner,'super_admin']));await assert.rejects(q('select * from private.content_workspaces'));}await as('super');await assert.rejects(rpc('cms_assign_role',[ids.super,null]));});
test('editor creates N5 grammar draft that is invisible publicly',async()=>{
 await as('editor');lesson=await rpc('cms_save',['lesson',null,{slug:'cms-n5-grammar',title:'N5 grammar CMS fixture',course_id:course,module_id:null,position:900,subject:'grammar',body,seo:{title:'',description:'',canonical:'',image:'',index:false}},0,null]);
 const w=await rpc('cms_document',['lesson',lesson]);assert.equal(w.state,'draft');version=w.version;
 await as('','anon');assert.equal((await q('select id from public.lessons where id=$1',[lesson])).length,0);await assert.rejects(rpc('cms_document',['lesson',lesson]));
});
test('approval requires separate reviewer and publisher permission',async()=>{
 await as('editor');await rpc('cms_transition',['lesson',lesson,version,'submit']);version++;
 await assert.rejects(rpc('cms_transition',['lesson',lesson,version,'approve','I reviewed this content carefully.']));
 await as('reviewer');await rpc('cms_transition',['lesson',lesson,version,'approve','Reviewed Japanese, translation and grammar.']);version++;
 await assert.rejects(rpc('cms_transition',['lesson',lesson,version,'publish']));
 await as('publisher');await rpc('cms_transition',['lesson',lesson,version,'publish']);version++;
 await as('','anon');const live=(await q('select * from public.lessons where id=$1',[lesson]))[0];assert.equal(live.title,'N5 grammar CMS fixture');assert.equal(live.subject,'grammar');assert.equal(live.published,true);
});
test('new edits stay private while published revision remains readable',async()=>{
 await as('editor');const w=await rpc('cms_document',['lesson',lesson]);await rpc('cms_save',['lesson',lesson,{...w.document,title:'Revised private title'},w.version,null]);version=w.version+1;
 assert.equal((await rpc('cms_document',['lesson',lesson])).live_published,true);
 await assert.rejects(rpc('cms_save',['lesson',lesson,w.document,w.version,null]));
 await as('','anon');assert.equal((await q('select title from public.lessons where id=$1',[lesson]))[0].title,'N5 grammar CMS fixture');
});
test('reviewed revision atomically replaces published content and histories restore to draft',async()=>{
 await as('editor');await rpc('cms_transition',['lesson',lesson,version,'submit']);version++;
 await as('reviewer');await rpc('cms_transition',['lesson',lesson,version,'approve','Reviewed the revised title and unchanged lesson.']);version++;
 await as('publisher');await rpc('cms_transition',['lesson',lesson,version,'publish']);version++;
 await as('','anon');assert.equal((await q('select title from public.lessons where id=$1',[lesson]))[0].title,'Revised private title');
 await as('editor');const h=await rpc('cms_history',['lesson',lesson]);assert.equal(h.length,2);await rpc('cms_restore',['lesson',lesson,h.at(-1).id,version]);version++;
 assert.equal((await rpc('cms_document',['lesson',lesson])).state,'draft');
 await as('','anon');assert.equal((await q('select title from public.lessons where id=$1',[lesson]))[0].title,'Revised private title');
});
test('unpublish revokes public access and live records use safe archival',async()=>{
 await as('editor');await assert.rejects(rpc('cms_transition',['lesson',lesson,version,'unpublish']));
 await as('publisher');await assert.rejects(rpc('cms_transition',['lesson',lesson,version,'delete']));await rpc('cms_transition',['lesson',lesson,version,'unpublish']);version++;
 assert.equal((await rpc('cms_document',['lesson',lesson])).live_published,false);
 await as('','anon');assert.equal((await q('select id from public.lessons where id=$1',[lesson])).length,0);
});
test('unsafe content, forged state and foreign canonical URLs are rejected',async()=>{
 await as('editor');for(const doc of [{...body,text:'<script>alert(1)</script>'}])await assert.rejects(rpc('cms_save',['lesson',null,{title:'Unsafe',slug:'unsafe',course_id:course,subject:'grammar',body:doc},0,null]));
 await assert.rejects(rpc('cms_save',['course',null,{title:'Bad canonical',slug:'bad',seo:{canonical:'https://evil.example/'}},0,null]));
});
test('editor cannot read user directory; Super Admin reads are audited',async()=>{await as('editor');await assert.rejects(rpc('cms_users'));await as('super');const users=await rpc('cms_users',['editor',0]);assert.equal(users.length,1);assert.equal(users[0].email,'editor@example.test');await db.exec('reset role');assert.ok((await q("select id from private.admin_audit_logs where action='user_directory_read'")).length>0);});
test('private projection adapters are not executable by learners',async()=>{await as('learner');await assert.rejects(rpc('cms_run_scheduled'));await assert.rejects(q("select private.cms_admin_learning_preview('bank',gen_random_uuid())"));});
test('an unverified legacy allowlist member still has no administrative privileges',async()=>{await db.exec('reset role');await q('insert into private.admin_users(user_id) values($1)',[ids.unverified]);await as('unverified');assert.equal(await rpc('is_admin'),false);assert.equal((await rpc('cms_session')).role,null);await assert.rejects(rpc('cms_dashboard'));});
async function draftAndReview(kind,document,notes='Reviewed Japanese, examples and editorial accuracy.'){
 await as('editor');const id=await rpc('cms_save',[kind,null,document,0,null]);await rpc('cms_transition',[kind,id,1,'submit']);await as('reviewer');await rpc('cms_transition',[kind,id,2,'approve',notes]);return id;
}
async function publish(kind,document,notes){const id=await draftAndReview(kind,document,notes);await as('publisher');await rpc('cms_transition',[kind,id,3,'publish']);return id;}
let vocabularyId,bankId,fixtureAudio;
const vocabulary={course_id:null,term:'試験用語',reading:'しけんようご',meaning_en:'test vocabulary fixture',meaning_ja:'試験で使う言葉。',example:'{言葉|ことば}を{読|よ}みます。',example_translation:'I read the word.',category:'Local test'};
test('published vocabulary reaches the real flashcard tables and unpublication withdraws it',async()=>{
 vocabularyId=await publish('vocabulary',{...vocabulary,course_id:course});
 await as('','anon');assert.equal((await q('select id from public.flashcards where vocabulary_id=$1',[vocabularyId])).length,1);
 await as('publisher');await rpc('cms_transition',['vocabulary',vocabularyId,4,'unpublish']);
 await as('','anon');assert.equal((await q('select id from public.flashcards where vocabulary_id=$1',[vocabularyId])).length,0);
});
test('CSV import previews duplicate detection and creates only private drafts',async()=>{
 await as('editor');const rows=[{...vocabulary,course_id:course},{...vocabulary,term:'試験資料',reading:'しけんしりょう',course_id:course}];
 const preview=await rpc('cms_import_vocabulary',[course,rows,true]);assert.equal(preview[0].duplicate,true);assert.equal(preview[1].id,null);
 const imported=await rpc('cms_import_vocabulary',[course,rows,false]);assert.equal(imported[0].id,null);assert.ok(imported[1].id);
 const w=await rpc('cms_document',['vocabulary',imported[1].id]);assert.equal(w.state,'draft');
 await assert.rejects(rpc('cms_import_vocabulary',[course,[rows[1],rows[1]],false]));
 await as('','anon');assert.equal((await q('select id from public.vocabulary where id=$1',[imported[1].id])).length,0);
});
test('kanji uses published-only RLS and draft edits do not overwrite live entries',async()=>{
 const id=await publish('kanji',{title:'山',course_id:course,character:'山',onyomi:'サン',kunyomi:'やま',meaning:'mountain',example_words:'富士山',lesson_id:null});
 await as('','anon');assert.equal((await q('select meaning from public.kanji_entries where id=$1',[id]))[0].meaning,'mountain');
 await as('editor');const w=await rpc('cms_document',['kanji',id]);await rpc('cms_save',['kanji',id,{...w.document,meaning:'private revised meaning'},w.version,null]);
 await as('','anon');assert.equal((await q('select meaning from public.kanji_entries where id=$1',[id]))[0].meaning,'mountain');
});
test('question banks keep keys private and assemble a usable reviewed practice examination',async()=>{
 bankId=await publish('bank',{course_id:course,title:'CMS grammar fixture bank',subject:'grammar',questions:[{prompt:'パン（　）{食|た}べます。',options:['を','に'],correctIndex:0,explanation:'を marks the direct object of the action.',japaneseExplanation:'「を」は食べるものを表します。',translation:'I eat bread.'}]});
 await as('','anon');const questions=await q('select id,prompt from public.questions where bank_id=$1',[bankId]);assert.equal(questions.length,1);await assert.rejects(q('select * from private.answer_keys'));
 const id=await publish('exam',{title:'CMS local grammar practice',level:'n5',mode:'section',source_bank_id:bankId,question_ids:[questions[0].id],duration_seconds:300});
 await as('learner');const attempt=crypto.randomUUID();await rpc('start_exam',[attempt,id,1,'mixed']);const exam=await rpc('get_exam',[attempt]);assert.equal(exam.questions.length,1);assert.equal('correctIndex' in exam.questions[0],false);assert.equal('correctOptionId' in exam.questions[0],false);
});
test('scheduled content is private until a trusted worker publishes it and revoked publishers fail closed',async()=>{
 const id=await draftAndReview('lesson',{slug:'scheduled-cms-fixture',title:'Scheduled fixture',course_id:course,module_id:null,position:901,subject:'grammar',body});
 await as('publisher');await rpc('cms_transition',['lesson',id,3,'schedule','',new Date(Date.now()+3600000).toISOString()]);
 await as('','anon');assert.equal((await q('select id from public.lessons where id=$1',[id])).length,0);
 await db.exec('reset role');await q("update private.content_workspaces set scheduled_at=now()-interval '1 minute' where entity_id=$1",[id]);await as('','service_role');const result=await rpc('cms_run_scheduled');assert.equal(result.published,1);
 await as('','anon');assert.equal((await q('select id from public.lessons where id=$1',[id])).length,1);
 const second=await draftAndReview('lesson',{slug:'revoked-cms-fixture',title:'Revoked schedule fixture',course_id:course,module_id:null,position:902,subject:'grammar',body});await as('publisher');await rpc('cms_transition',['lesson',second,3,'schedule','',new Date(Date.now()+3600000).toISOString()]);await as('super');await rpc('cms_assign_role',[ids.publisher,null]);
 await db.exec('reset role');await q("update private.content_workspaces set scheduled_at=now()-interval '1 minute' where entity_id=$1",[second]);await as('','service_role');assert.equal((await rpc('cms_run_scheduled')).failed,1);await as('','anon');assert.equal((await q('select id from public.lessons where id=$1',[second])).length,0);await as('super');await rpc('cms_assign_role',[ids.publisher,'content_admin']);
});
test('media registration is service-only, private until approved and linked; referenced assets are protected',async()=>{
 const id=crypto.randomUUID(),doc={object_path:`${id}/asset.wav`,title:'Local audio fixture',filename:'fixture.wav',mime_type:'audio/wav',byte_size:100,sha256:'a'.repeat(64),replaces_id:null};
 fixtureAudio=id;
 await as('editor');await assert.rejects(rpc('cms_media_register',[ids.editor,id,doc]));await as('','service_role');await rpc('cms_media_register',[ids.editor,id,doc]);
 await as('','anon');assert.equal(await rpc('cms_media_resolve',[id]),null);await as('editor');assert.ok(await rpc('cms_media_resolve',[id]));await assert.rejects(rpc('cms_media_update',[id,'approve','','I reviewed this audio.']));
 await as('publisher');await rpc('cms_media_update',[id,'approve','','Reviewed audio and educational license.']);await as('','anon');assert.equal(await rpc('cms_media_resolve',[id]),null);
 const lessonId=await publish('lesson',{slug:'audio-cms-fixture',title:'Audio fixture lesson',course_id:course,module_id:null,position:903,subject:'grammar',body,media_ids:[id]});
 await as('','anon');assert.equal((await rpc('cms_media_resolve',[id])).mime_type,'audio/wav');assert.equal((await rpc('cms_published_media',['lesson',lessonId])).length,1);
 await as('publisher');await assert.rejects(rpc('cms_media_update',[id,'archive']));await rpc('cms_transition',['lesson',lessonId,4,'unpublish']);await as('','anon');assert.equal(await rpc('cms_media_resolve',[id]),null);
});
test('guide sources and categories keep the existing verification and review boundaries',async()=>{
 const source=await publish('guide_source',{title:'Official source fixture',url:'https://www.moj.go.jp/fixture',summary:'Local source testing only.',summary_ja:'試験のための公式情報。',jurisdiction:'Japan',publication_date:null,verified_at:new Date().toISOString().slice(0,10)});
 const category=await publish('guide_category',{title:'Local guide category',title_ja:'地域情報',slug:'cms-guide-fixture',icon:'BookOpen',position:900});
 const content={sections:[{id:'intro',title:'Local fixture guidance',text:'This is disposable editorial test content.',kind:'suggestion'}],steps:['Read the source.'],documents:[],deadline:null,phrases:[],dialogue:[],roleplays:[]};
 const doc={title:'Reviewed guide fixture',slug:'cms-reviewed-guide',category_id:category,summary:'A disposable guide fixture summary.',content,format:'guide',audiences:['resident'],stages:['settling'],risk:'legal',deck_id:null,bank_id:null,lesson_ids:[],ai_scenario_id:null,source_ids:[source],media_ids:[fixtureAudio],seo:{title:'Guide SEO fixture',description:'Reviewed fixture description.',canonical:'',image:'',index:false},translations:[{locale:'ja',title:'確認済みの記事',summary:'確認済みの記事の説明です。',content}]};
 const id=await draftAndReview('guide_article',doc,'Reviewed content without source attestation.');await as('publisher');await assert.rejects(rpc('cms_transition',['guide_article',id,3,'publish']));
 await as('editor');const w=await rpc('cms_document',['guide_article',id]);await rpc('cms_save',['guide_article',id,doc,w.version,null]);await rpc('cms_transition',['guide_article',id,4,'submit']);await as('reviewer');await rpc('cms_transition',['guide_article',id,5,'approve','[sources-reviewed] Reviewed official source, applicability and Japanese translation.']);await as('publisher');await rpc('cms_transition',['guide_article',id,6,'publish']);
 await as('','anon');assert.equal((await q('select id,last_reviewed_at from public.guide_articles where id=$1',[id])).length,1);
 assert.equal((await rpc('cms_published_media',['guide_article',id])).length,1);assert.ok(await rpc('cms_media_resolve',[fixtureAudio]));assert.equal((await rpc('cms_public_metadata',['guide_article',id])).title,'Guide SEO fixture');assert.equal((await rpc('cms_content_sitemap')).find(row=>row.path==='japan-guide/cms-reviewed-guide').indexable,false);
});
test('course access is inherited without removing independent lesson billing rules',async()=>{
 const courseId=await publish('course',{title:'CMS premium fixture',slug:'cms-premium-fixture',program_id:null,premium_feature:'jlpt'});
 const id=await publish('lesson',{title:'Premium lesson fixture',slug:'premium-fixture',course_id:courseId,module_id:null,position:0,subject:'grammar',body});
 await as('learner');assert.equal(await rpc('billing_resource_access',['lessons',id]),false);assert.equal((await q('select id from public.lessons where id=$1',[id])).length,0);
 await db.exec('reset role');await q("insert into public.premium_requirements values('lessons',$1,'mock_exams')",[id]);
 await as('editor');const w=await rpc('cms_document',['course',courseId]);await rpc('cms_save',['course',courseId,{...w.document,premium_feature:null},w.version,null]);await rpc('cms_transition',['course',courseId,w.version+1,'submit']);await as('reviewer');await rpc('cms_transition',['course',courseId,w.version+2,'approve','Reviewed free course setting; independent lesson gates remain.']);await as('publisher');await rpc('cms_transition',['course',courseId,w.version+3,'publish']);
 await as('learner');assert.equal(await rpc('billing_resource_access',['courses',courseId]),true);assert.equal(await rpc('billing_resource_access',['lessons',id]),false);
});
