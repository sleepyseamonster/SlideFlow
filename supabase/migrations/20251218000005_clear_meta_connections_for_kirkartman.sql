/*
  Temporary cleanup: remove all Instagram/Facebook Meta connections for the user email `kirkartman00@gmail.com`.
  This deletes connected_account rows (and cascades via explicit delete for secrets) for that user only.
*/

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = 'kirkartman00@gmail.com'
  limit 1;

  if v_user_id is null then
    raise notice 'No user found for email kirkartman00@gmail.com';
    return;
  end if;

  delete from public.connected_account_secret
  where account_id in (
    select id from public.connected_account
    where user_id = v_user_id
      and platform = 'instagram'
  );

  delete from public.connected_account
  where user_id = v_user_id
    and platform = 'instagram';
end $$;

