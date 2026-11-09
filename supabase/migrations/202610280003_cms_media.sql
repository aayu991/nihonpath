begin;
create table private.media_assets(id uuid primary key,object_path text unique not null check(object_path ~ '^[a-f0-9-]{36}/asset\.(png|jpg|webp|mp3|ogg|wav|pdf)$'),title text not null check(char_length(title) between 1 and 180),filename text not null,mime_type text not null check(mime_type in ('image/png','image/jpeg','image/webp','audio/mpeg','audio/ogg','audio/wav','application/pdf')),byte_size integer not null check(byte_size between 1 and 25000000),sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),status text not null default 'private' check(status in ('private','approved','archived')),uploaded_by uuid references auth.users(id) on delete set null,reviewed_by uuid references auth.users(id) on delete set null,review_notes text,replaces_id uuid references private.media_assets(id),created_at timestamptz not null default now(),updated_at timestamptz not null default clock_timestamp());
create table private.media_links(asset_id uuid not null references private.media_assets(id),entity_kind text not null,entity_id uuid not null,primary key(asset_id,entity_kind,entity_id));
create index cms_media_search on private.media_assets(status,created_at desc);
create index cms_media_parent on private.media_links(entity_kind,entity_id);
alter table private.media_assets enable row level security;
alter table private.media_links enable row level security;
revoke all on private.media_assets,private.media_links from public,anon,authenticated;
-- No direct browser writes: server validates signatures/size before service upload.
do $$begin if to_regclass('storage.buckets') is not null then
 if exists(select 1 from storage.buckets where id='cms-education' and public) then raise exception 'cms-education must be a private bucket';end if;
 insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('cms-education','cms-education',false,25000000,array['image/png','image/jpeg','image/webp','audio/mpeg','audio/ogg','audio/wav','application/pdf']) on conflict(id) do nothing;
end if;end$$;
create function public.cms_media_register(p_actor uuid,p_id uuid,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from auth.users u where u.id=p_actor and to_jsonb(u)->>'email_confirmed_at' is not null) or not (exists(select 1 from private.admin_users where user_id=p_actor) or exists(select 1 from private.admin_role_assignments where user_id=p_actor and role in ('super_admin','content_admin','content_editor'))) then raise exception 'Verified editor required';end if;
 if split_part(p_data->>'object_path','/',1)<>p_id::text then raise exception 'Object ID mismatch';end if;
 insert into private.media_assets(id,object_path,title,filename,mime_type,byte_size,sha256,uploaded_by,replaces_id) values(p_id,p_data->>'object_path',p_data->>'title',left(p_data->>'filename',250),p_data->>'mime_type',(p_data->>'byte_size')::integer,p_data->>'sha256',p_actor,(p_data->>'replaces_id')::uuid);
 insert into private.admin_audit_logs(actor_id,action,entity_kind,entity_id) values(p_actor,'media_upload','media',p_id);
end$$;
create function public.cms_media_list(p_query text default '',p_type text default '') returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not private.cms_can('read') then raise exception 'CMS required';end if;
 if char_length(p_query)>100 then raise exception 'Search too long';end if;
 return coalesce((select jsonb_agg(to_jsonb(a)) from (select id,title,filename,mime_type,byte_size,status,replaces_id,created_at,(select count(*) from private.media_links where asset_id=m.id) references from private.media_assets m where title ilike '%'||p_query||'%' and (p_type='' or mime_type like p_type||'/%') order by created_at desc limit 60) a),'[]');
end$$;
create function public.cms_media_update(p_id uuid,p_action text,p_title text default '',p_notes text default '') returns void language plpgsql security definer set search_path='' as $$begin
 if not private.cms_can('edit') then raise exception 'Editor required';end if;
 perform 1 from private.media_assets where id=p_id for update;if not found then raise exception 'Asset missing';end if;
 case p_action
 when 'rename' then if char_length(trim(p_title)) not between 1 and 180 then raise exception 'Title required';end if;update private.media_assets set title=p_title,updated_at=clock_timestamp() where id=p_id;
 when 'approve' then if not private.cms_can('publish') or char_length(trim(p_notes))<10 then raise exception 'Publisher and actual media-review notes required';end if;update private.media_assets set status='approved',reviewed_by=auth.uid(),review_notes=p_notes,updated_at=clock_timestamp() where id=p_id;
 when 'archive' then if not private.cms_can('publish') then raise exception 'Publisher required';end if;
  if exists(select 1 from private.media_links where asset_id=p_id) or exists(select 1 from private.content_workspaces where document::text like '%'||p_id::text||'%') then raise exception 'Asset is referenced; remove associations and republish first';end if;
  update private.media_assets set status='archived',updated_at=clock_timestamp() where id=p_id;
 else raise exception 'Invalid media action';end case;perform private.cms_log('media_'||p_action,'media',p_id);
end$$;
create function public.cms_media_resolve(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare m private.media_assets;begin
 select * into m from private.media_assets where id=p_id and status<>'archived';if not found then return null;end if;
 if not private.cms_can('read') and (m.status<>'approved' or not exists(select 1 from private.media_links l where l.asset_id=p_id and (case when l.entity_kind='guide_article' then private.guide_visible(l.entity_id) else private.content_visible(l.entity_kind,l.entity_id) end) and public.billing_resource_access(case l.entity_kind when 'lesson' then 'lessons' when 'course' then 'courses' when 'guide_article' then 'guide_articles' else '' end,l.entity_id))) then return null;end if;
 return jsonb_build_object('id',m.id,'object_path',m.object_path,'mime_type',m.mime_type,'filename',m.filename,'title',m.title);
end$$;
alter function private.cms_project(text,uuid,uuid) rename to cms_project_catalog;
create function private.cms_project(p_kind text,p_id uuid,p_actor uuid) returns void language plpgsql security definer set search_path='' as $$declare doc jsonb;asset uuid;begin
 select document into doc from private.content_workspaces where entity_kind=p_kind and entity_id=p_id;
 perform private.cms_project_catalog(p_kind,p_id,p_actor);
 delete from private.media_links where entity_kind=p_kind and entity_id=p_id;
 if nullif(doc->'seo'->>'image','') is not null and not exists(select 1 from private.media_assets where id=(doc->'seo'->>'image')::uuid and status='approved' and mime_type like 'image/%') then raise exception 'Open Graph image needs approved image media';end if;
 for asset in select distinct value::uuid from jsonb_array_elements_text(coalesce(doc->'media_ids','[]')||case when nullif(doc->'seo'->>'image','') is null then '[]'::jsonb else jsonb_build_array(doc->'seo'->>'image') end) loop
  perform 1 from private.media_assets where id=asset and status='approved' for key share;
  if not found then raise exception 'Media needs approval before content publication';end if;
  insert into private.media_links values(asset,p_kind,p_id) on conflict do nothing;
 end loop;
end$$;
revoke all on function public.cms_media_register(uuid,uuid,jsonb),public.cms_media_list(text,text),public.cms_media_update(uuid,text,text,text),public.cms_media_resolve(uuid) from public;
create function public.cms_published_media(p_kind text,p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if p_kind not in ('lesson','course','guide_article') or not (case when p_kind='guide_article' then private.guide_visible(p_id) else private.content_visible(p_kind,p_id) end) or not public.billing_resource_access(case p_kind when 'lesson' then 'lessons' when 'guide_article' then 'guide_articles' else 'courses' end,p_id) then return '[]';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'mime_type',m.mime_type)) from private.media_links l join private.media_assets m on m.id=l.asset_id where l.entity_kind=p_kind and l.entity_id=p_id and m.status='approved'),'[]');
end$$;
revoke all on function public.cms_published_media(text,uuid) from public;
grant execute on function public.cms_published_media(text,uuid) to anon,authenticated;
grant execute on function public.cms_media_list(text,text),public.cms_media_update(uuid,text,text,text) to authenticated;
grant execute on function public.cms_media_resolve(uuid) to anon,authenticated;
do $$begin if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.cms_media_register(uuid,uuid,jsonb) to service_role;end if;end$$;
do $$declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname like 'cms_%' loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);end loop;end$$;
commit;
