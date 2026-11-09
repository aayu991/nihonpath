begin;
-- Draft containers protect child cards/questions. Children cannot be edited in place
-- after attempts/reviews exist; create a new revision to preserve historical results.
alter table public.flashcard_decks add column review_status text not null default 'draft' check(review_status in ('draft','in_review','approved'));
alter table public.question_banks add column review_status text not null default 'draft' check(review_status in ('draft','in_review','approved'));
update public.flashcard_decks set review_status='approved' where published;
update public.question_banks set review_status='approved' where published;
do $$declare t text;begin foreach t in array array['flashcard_decks','question_banks'] loop execute format('create trigger a_review_guard before insert or update on public.%I for each row execute function private.guard_content_review()',t);execute format('create trigger review_audit after insert or update on public.%I for each row execute function private.log_content_review()',t);end loop;end$$;
create function public.admin_learning_save(p_kind text,p_id uuid,p_data jsonb,p_expected_updated_at timestamptz default null) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid:=coalesce(p_id,gen_random_uuid());item jsonb;opt jsonb;item_id uuid;option_id uuid;position_index integer:=0;option_index integer;version timestamptz;begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 if p_kind not in ('vocabulary','deck','bank') or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>200000 then raise exception 'Invalid document';end if;
 if p_kind='vocabulary' then
 if p_id is null then insert into public.vocabulary(id,course_id,term,reading,meaning_en,meaning_ja,example,example_translation,category) values(result,(p_data->>'course_id')::uuid,p_data->>'term',p_data->>'reading',p_data->>'meaning_en',p_data->>'meaning_ja',p_data->>'example',p_data->>'example_translation',coalesce(p_data->>'category','General'));
 else update public.vocabulary set course_id=(p_data->>'course_id')::uuid,term=p_data->>'term',reading=p_data->>'reading',meaning_en=p_data->>'meaning_en',meaning_ja=p_data->>'meaning_ja',example=p_data->>'example',example_translation=p_data->>'example_translation',category=coalesce(p_data->>'category','General'),published=false,review_status='draft' where id=p_id and updated_at=p_expected_updated_at returning id into result;if result is null then raise exception 'Stale version';end if;end if;
 elsif p_kind='deck' then
 if jsonb_typeof(p_data->'cards')<>'array' or jsonb_array_length(p_data->'cards') not between 1 and 100 then raise exception 'Provide 1 to 100 cards';end if;
 if p_id is null then insert into public.flashcard_decks(id,course_id,title) values(result,(p_data->>'course_id')::uuid,p_data->>'title');
 else select updated_at into version from public.flashcard_decks where id=p_id for update;if version is distinct from p_expected_updated_at then raise exception 'Stale version';end if;
 if exists(select 1 from public.flashcard_reviews r join public.flashcards c on c.id=r.flashcard_id where c.deck_id=p_id) then raise exception 'Reviewed deck: create a new revision';end if;
 update public.flashcard_decks set title=p_data->>'title',course_id=(p_data->>'course_id')::uuid,published=false,review_status='draft' where id=p_id;
 delete from public.flashcards where deck_id=p_id;end if;
 for item in select value from jsonb_array_elements(p_data->'cards') loop
 insert into public.flashcards(deck_id,term,reading,translations,example,example_translation,position,category) values(result,item->>'term',item->>'reading',jsonb_build_object('en',item->>'meaning_en','ja',item->>'meaning_ja'),item->>'example',item->>'example_translation',position_index,coalesce(item->>'category','General'));position_index:=position_index+1;end loop;
 else
 if p_data->>'subject' not in ('vocabulary','kanji','grammar','reading') or jsonb_typeof(p_data->'questions')<>'array' or jsonb_array_length(p_data->'questions') not between 1 and 100 then raise exception 'Invalid question bank; listening needs a separate audio integration';end if;
 if p_id is null then insert into public.question_banks(id,course_id,title,subject) values(result,(p_data->>'course_id')::uuid,p_data->>'title',p_data->>'subject');
 else select updated_at into version from public.question_banks where id=p_id for update;if version is distinct from p_expected_updated_at then raise exception 'Stale version';end if;
 if exists(select 1 from public.quiz_attempts where bank_id=p_id) then raise exception 'Attempted bank: create a new revision';end if;
 update public.question_banks set title=p_data->>'title',course_id=(p_data->>'course_id')::uuid,subject=p_data->>'subject',published=false,review_status='draft' where id=p_id;
 delete from public.questions where bank_id=p_id;end if;
 for item in select value from jsonb_array_elements(p_data->'questions') loop
 if jsonb_typeof(item->'options')<>'array' or jsonb_array_length(item->'options') not between 2 and 4 or (item->>'correctIndex')::integer not between 0 and jsonb_array_length(item->'options')-1 then raise exception 'One valid correct option is required';end if;
 if (select count(distinct value) from jsonb_array_elements_text(item->'options'))<>jsonb_array_length(item->'options') then raise exception 'Duplicate options';end if;
 item_id:=gen_random_uuid();insert into public.questions(id,bank_id,prompt,position) values(item_id,result,item->>'prompt',position_index);option_index:=0;
 for opt in select value from jsonb_array_elements(item->'options') loop
 option_id:=gen_random_uuid();insert into public.question_options(id,question_id,text,position) values(option_id,item_id,opt#>>'{}',option_index);
 if option_index=(item->>'correctIndex')::integer then insert into private.answer_keys(question_id,option_id,explanation,japanese_explanation,translation) values(item_id,option_id,item->>'explanation',item->>'japaneseExplanation',item->>'translation');end if;option_index:=option_index+1;end loop;
 position_index:=position_index+1;end loop;
 end if;return result;end$$;
create function public.admin_learning_review(p_kind text,p_id uuid,p_action text,p_expected_updated_at timestamptz) returns uuid language plpgsql security definer set search_path='' as $$declare tbl text;doc jsonb;state text;pub boolean;valid boolean;begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 tbl:=case p_kind when 'vocabulary' then 'vocabulary' when 'deck' then 'flashcard_decks' when 'bank' then 'question_banks' end;if tbl is null then raise exception 'Invalid kind';end if;
 execute format('select to_jsonb(t) from public.%I t where id=$1 and updated_at=$2 for update',tbl) into doc using p_id,p_expected_updated_at;
 if doc is null then raise exception 'Stale version';end if;state:=doc->>'review_status';pub:=(doc->>'published')::boolean;
 case p_action when 'request_review' then if state<>'draft' or pub then raise exception 'Draft required';end if;state:='in_review';
 when 'approve' then if state<>'in_review' or pub then raise exception 'Review required';end if;state:='approved';
 when 'publish' then
 if state<>'approved' or pub or not private.content_visible('course',(doc->>'course_id')::uuid) then raise exception 'Approved content and published parent required';end if;
 if p_kind='vocabulary' then valid:=coalesce(length(doc->>'meaning_en')>0 and length(doc->>'meaning_ja')>0 and (doc->>'term')~'[ぁ-んァ-ヶ一-龯]' and (doc->>'reading')~'[ぁ-んァ-ヶ]' and (doc->>'example')~'[ぁ-んァ-ヶ一-龯]',false);
 elsif p_kind='deck' then select exists(select 1 from public.flashcards where deck_id=p_id) and not exists(select 1 from public.flashcards where deck_id=p_id and (term!~'[ぁ-んァ-ヶ一-龯]' or reading!~'[ぁ-んァ-ヶ]' or example!~'[ぁ-んァ-ヶ一-龯]' or coalesce(length(translations->>'en'),0)=0 or coalesce(length(example_translation),0)=0)) into valid;
 else select exists(select 1 from public.questions where bank_id=p_id) and not exists(select 1 from public.questions q left join private.answer_keys k on k.question_id=q.id where q.bank_id=p_id and (q.prompt!~'[ぁ-んァ-ヶ一-龯]' or k.question_id is null or length(k.explanation)<10 or k.japanese_explanation!~'[ぁ-んァ-ヶ一-龯]' or (select count(*) from public.question_options o where o.question_id=q.id) not between 2 and 4)) into valid;
 end if;
 if not coalesce(valid,false) then raise exception 'Japanese text, readings, translations and one answer key must be validated';end if;pub:=true;
 when 'unpublish' then pub:=false;
 else raise exception 'Invalid action';end case;
 execute format('update public.%I set review_status=$1,published=$2 where id=$3',tbl) using state,pub,p_id;return p_id;end$$;
create function public.admin_learning_preview(p_kind text,p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare doc jsonb;items jsonb;begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 if p_kind='vocabulary' then select to_jsonb(v) into doc from public.vocabulary v where id=p_id;
 elsif p_kind='deck' then select to_jsonb(d) into doc from public.flashcard_decks d where id=p_id;select coalesce(jsonb_agg(jsonb_build_object('term',term,'reading',reading,'meaning_en',translations->>'en','meaning_ja',translations->>'ja','example',example,'example_translation',example_translation,'category',category) order by position),'[]') into items from public.flashcards where deck_id=p_id;doc:=doc||jsonb_build_object('cards',items);
 elsif p_kind='bank' then select to_jsonb(b) into doc from public.question_banks b where id=p_id;select coalesce(jsonb_agg(jsonb_build_object('prompt',q.prompt,'options',(select jsonb_agg(o.text order by o.position) from public.question_options o where o.question_id=q.id),'correctIndex',(select o.position from public.question_options o where o.id=k.option_id),'explanation',k.explanation,'japaneseExplanation',k.japanese_explanation,'translation',k.translation) order by q.position),'[]') into items from public.questions q left join private.answer_keys k on k.question_id=q.id where q.bank_id=p_id;doc:=doc||jsonb_build_object('questions',items);
 else raise exception 'Invalid kind';end if;return doc;end$$;
revoke all on function public.admin_learning_save(text,uuid,jsonb,timestamptz),public.admin_learning_review(text,uuid,text,timestamptz),public.admin_learning_preview(text,uuid) from public;
grant execute on function public.admin_learning_save(text,uuid,jsonb,timestamptz),public.admin_learning_review(text,uuid,text,timestamptz),public.admin_learning_preview(text,uuid) to authenticated;
-- Protect in-place edits performed through the REST API too, not only the editor.
create function private.guard_study_child() returns trigger language plpgsql security definer set search_path='' as $$declare parent uuid;old_parent uuid;doc jsonb;old_doc jsonb;begin
 doc:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;old_doc:=case when tg_op='INSERT' then doc else to_jsonb(old) end;
 if tg_table_name='flashcards' then parent:=(doc->>'deck_id')::uuid;old_parent:=(old_doc->>'deck_id')::uuid;
 if exists(select 1 from public.flashcard_decks where id in(parent,old_parent) and published) then raise exception 'Unpublish and version the deck before editing';end if;
 if tg_op<>'INSERT' and exists(select 1 from public.flashcard_reviews where flashcard_id=(old_doc->>'id')::uuid) then raise exception 'Reviewed card: create a new revision';end if;
 else
 if tg_table_name='questions' then parent:=(doc->>'bank_id')::uuid;old_parent:=(old_doc->>'bank_id')::uuid;
 else select bank_id into parent from public.questions where id=(doc->>'question_id')::uuid;select bank_id into old_parent from public.questions where id=(old_doc->>'question_id')::uuid;end if;
 if exists(select 1 from public.question_banks where id in(parent,old_parent) and published) then raise exception 'Unpublish and version the bank before editing';end if;
 if exists(select 1 from public.quiz_attempts where bank_id in(parent,old_parent)) then raise exception 'Attempted bank: create a new revision';end if;
 end if;if tg_op='DELETE' then return old;end if;return new;end$$;
-- Existing published data stays unchanged; this guard applies to subsequent mutations.
create trigger study_child_guard before insert or update or delete on public.flashcards for each row execute function private.guard_study_child();
create trigger study_child_guard before insert or update or delete on public.questions for each row execute function private.guard_study_child();
create trigger study_child_guard before insert or update or delete on public.question_options for each row execute function private.guard_study_child();
revoke all on all functions in schema private from public,anon,authenticated;
commit;
