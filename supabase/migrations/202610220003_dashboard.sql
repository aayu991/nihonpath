begin;
create function public.dashboard_summary() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'reviews',(select count(*) from public.flashcard_reviews where user_id=auth.uid()),
 'attempts',(select count(*) from public.quiz_attempts where user_id=auth.uid()),
 'accuracy',(select round(avg(score::numeric/total*100),1) from public.quiz_attempts where user_id=auth.uid()),
 'lessons',(select count(*) from public.lessons l join public.courses c on c.id=l.course_id where l.published and c.slug=(select jlpt_target from public.profiles where id=auth.uid())),
 'completed',(select count(*) from public.lesson_progress p join public.lessons l on l.id=p.lesson_id join public.courses c on c.id=l.course_id where p.user_id=auth.uid() and p.completed_at is not null and l.published and c.slug=(select jlpt_target from public.profiles where id=auth.uid()))
 );
$$;
revoke all on function public.dashboard_summary() from public;
grant execute on function public.dashboard_summary() to authenticated;
commit;