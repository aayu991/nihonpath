begin;
create function private.content_table(p_kind text) returns text language sql immutable set search_path='' as $$select case p_kind when 'program' then 'learning_programs' when 'course' then 'courses' when 'module' then 'course_modules' when 'lesson' then 'lessons' when 'block' then 'lesson_blocks' when 'translation' then 'content_translations' end$$;
create function private.content_visible(p_kind text,p_id uuid) returns boolean language plpgsql stable set search_path='' as $$declare ok boolean;begin
 case p_kind
 when 'program' then select published into ok from public.learning_programs where id=p_id;
 when 'course' then select published and (program_id is null or private.content_visible('program',program_id)) into ok from public.courses where id=p_id;
 when 'module' then select published and private.content_visible('course',course_id) into ok from public.course_modules where id=p_id;
 when 'lesson' then select published and private.content_visible('course',course_id) and (module_id is null or private.content_visible('module',module_id)) into ok from public.lessons where id=p_id;
 when 'block' then select published and private.content_visible('lesson',lesson_id) into ok from public.lesson_blocks where id=p_id;
 else return false;end case;return coalesce(ok,false);end$$;
create function public.admin_save_content(p_kind text,p_id uuid,p_data jsonb,p_expected_updated_at timestamptz default null) returns uuid language plpgsql security definer set search_path='' as $$
declare tbl text:=private.content_table(p_kind);cols text[];column_sql text;select_sql text;update_sql text;result uuid;payload jsonb:=p_data;target text;
begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 if tbl is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>60000 then raise exception 'Invalid content';end if;
 case p_kind
 when 'program' then cols:=array['slug','title','summary','category'];
 when 'course' then cols:=array['slug','title','program_id'];
 when 'module' then cols:=array['title','course_id','position'];
 when 'lesson' then cols:=array['slug','title','course_id','module_id','position','body'];
 when 'block' then cols:=array['lesson_id','kind','position','content','deck_id','question_bank_id','audio_asset_id'];
 when 'translation' then
 target:=p_data->>'target_kind';if target not in ('program','course','module','lesson','block') or target is null then raise exception 'Invalid translation target';end if;
 payload:=jsonb_build_object(target||'_id',p_data->>'target_id','locale',p_data->>'locale','title',p_data->>'title','content',p_data->'content');
 cols:=array['program_id','course_id','module_id','lesson_id','block_id','locale','title','content'];
 end case;
 select string_agg(format('%I',c),','),string_agg(format('r.%I',c),','),string_agg(format('%I=r.%I',c,c),',') into column_sql,select_sql,update_sql from unnest(cols) c;
 if p_id is null then
 execute format('insert into public.%I(id,%s,review_status,published) select $1,%s,''draft'',false from jsonb_populate_record(null::public.%I,$2) r returning id',tbl,column_sql,select_sql,tbl) into result using gen_random_uuid(),payload;
 else
 if p_expected_updated_at is null then raise exception 'Record version required';end if;
 execute format('update public.%I t set %s,review_status=''draft'',published=false from jsonb_populate_record(null::public.%I,$2) r where t.id=$1 and t.updated_at=$3 returning t.id',tbl,update_sql,tbl) into result using p_id,payload,p_expected_updated_at;
 if result is null then raise exception 'Content changed; reload before editing';end if;
 end if;return result;
end$$;
create function public.admin_review_content(p_kind text,p_id uuid,p_action text,p_expected_updated_at timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
declare tbl text:=private.content_table(p_kind);row_data jsonb;state text;pub boolean;allowed boolean:=false;target_kind text;target_id uuid;
begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 if tbl is null or p_expected_updated_at is null then raise exception 'Invalid content';end if;
 execute format('select to_jsonb(t) from public.%I t where id=$1 and updated_at=$2 for update',tbl) into row_data using p_id,p_expected_updated_at;
 if row_data is null then raise exception 'Content changed; reload before editing';end if;
 state:=row_data->>'review_status';pub:=(row_data->>'published')::boolean;
 case p_action
 when 'request_review' then if state<>'draft' or pub then raise exception 'Only drafts can request review';end if;state:='in_review';
 when 'approve' then if state<>'in_review' or pub then raise exception 'Review content before approval';end if;state:='approved';
 when 'publish' then
 if state<>'approved' or pub then raise exception 'Approval required';end if;
 case p_kind
 when 'program' then allowed:=true;
 when 'course' then allowed:=row_data->>'program_id' is null or private.content_visible('program',(row_data->>'program_id')::uuid);
 when 'module' then allowed:=private.content_visible('course',(row_data->>'course_id')::uuid);
 when 'lesson' then allowed:=private.content_visible('course',(row_data->>'course_id')::uuid) and (row_data->>'module_id' is null or private.content_visible('module',(row_data->>'module_id')::uuid));
 when 'block' then
 allowed:=private.content_visible('lesson',(row_data->>'lesson_id')::uuid);
 if row_data->>'kind'='audio' then allowed:=allowed and exists(select 1 from public.audio_assets where id=(row_data->>'audio_asset_id')::uuid and status='ready' and published);end if;
 if row_data->>'kind'='flashcards' then allowed:=allowed and exists(select 1 from public.flashcard_decks d where d.id=(row_data->>'deck_id')::uuid and d.published and private.content_visible('course',d.course_id));end if;
 if row_data->>'kind'='quiz' then allowed:=allowed and exists(select 1 from public.question_banks b where b.id=(row_data->>'question_bank_id')::uuid and b.published and private.content_visible('course',b.course_id));end if;
 when 'translation' then
 foreach target_kind in array array['program','course','module','lesson','block'] loop target_id:=(row_data->>(target_kind||'_id'))::uuid;if target_id is not null then allowed:=private.content_visible(target_kind,target_id);end if;end loop;
 end case;
 if not coalesce(allowed,false) then raise exception 'Publish the parent and referenced assets first';end if;pub:=true;
 when 'unpublish' then if not pub then raise exception 'Content is not published';end if;pub:=false;
 else raise exception 'Invalid review action';end case;
 execute format('update public.%I set review_status=$1,published=$2 where id=$3',tbl) using state,pub,p_id;return p_id;
end$$;
revoke all on function public.admin_save_content(text,uuid,jsonb,timestamptz),public.admin_review_content(text,uuid,text,timestamptz) from public;
grant execute on function public.admin_save_content(text,uuid,jsonb,timestamptz),public.admin_review_content(text,uuid,text,timestamptz) to authenticated;
revoke all on all functions in schema private from public,anon,authenticated;
commit;
