begin;
create function public.course_progress(p_course uuid) returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object('total',(select count(*) from public.lessons where course_id=p_course and published),'completed',(select count(*) from public.lesson_progress p join public.lessons l on l.id=p.lesson_id where p.user_id=(select auth.uid()) and p.completed_at is not null and l.course_id=p_course and l.published))$$;
revoke all on function public.course_progress(uuid) from public;
grant execute on function public.course_progress(uuid) to authenticated;
commit;