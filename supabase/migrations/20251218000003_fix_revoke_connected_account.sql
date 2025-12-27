/*
  Fix revoke_connected_account ambiguity

  The previous definition used the parameter name account_id, which collided with
  column names and produced "column reference account_id is ambiguous". Rename
  the parameter and qualify references.
*/

create or replace function public.revoke_connected_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_platform text;
  v_was_primary boolean;
  v_new_primary uuid;
begin
  select user_id, platform, is_primary
    into v_user_id, v_platform, v_was_primary
  from public.connected_account
  where id = p_account_id and revoked_at is null;

  if not found then
    return;
  end if;

  if v_user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  update public.connected_account
    set revoked_at = now(), is_primary = false
  where id = p_account_id;

  delete from public.connected_account_secret
  where account_id = p_account_id;

  if v_was_primary then
    select id into v_new_primary
    from public.connected_account
    where user_id = v_user_id
      and platform = v_platform
      and revoked_at is null
    order by connected_at asc
    limit 1;

    if v_new_primary is not null then
      perform public.set_connected_account_primary(v_new_primary);
    end if;
  end if;
end;
$$;

grant execute on function public.revoke_connected_account(uuid) to authenticated;

