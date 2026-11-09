begin;
create function public.cms_user_detail(p_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not private.cms_can('users') then raise exception 'Super Admin required';end if;
 perform private.cms_log('user_detail_read','user',p_user);
 return jsonb_build_object('enrollments',coalesce((select jsonb_agg(jsonb_build_object('title',c.title,'created_at',e.created_at)) from public.course_enrollments e join public.courses c on c.id=e.course_id where e.user_id=p_user),'[]'),'support',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'subject',s.subject,'status',s.status,'created_at',s.created_at)) from public.support_requests s where user_id=p_user),'[]'));
end$$;
create function public.cms_user_operation(p_user uuid,p_action text) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.cms_can('users') then raise exception 'Super Admin required';end if;
 if p_user=auth.uid() or exists(select 1 from private.admin_users where user_id=p_user) or exists(select 1 from private.admin_role_assignments where user_id=p_user and role='super_admin') then raise exception 'Protected administrator account';end if;
 if p_action not in ('suspend_requested','suspend_completed','restore_requested','restore_completed','auth_operation_failed') then raise exception 'Invalid operation';end if;
 if not exists(select 1 from auth.users where id=p_user) then raise exception 'User missing';end if;
 perform private.cms_log(p_action,'user',p_user);
end$$;
revoke all on function public.cms_user_detail(uuid),public.cms_user_operation(uuid,text) from public;
grant execute on function public.cms_user_detail(uuid),public.cms_user_operation(uuid,text) to authenticated;
commit;
