/*
  Recreate revoke_connected_account with unambiguous column references and a distinct parameter name.
  This replaces any previous cached definition that referenced account_id without qualification.
*/

drop function if exists public.revoke_connected_account(uuid);

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
  select ca.user_id, ca.platform, ca.is_primary
    into v_user_id, v_platform, v_was_primary
  from public.connected_account ca
  where ca.id = p_account_id
    and ca.revoked_at is null;

  if not found then
    return;
  end if;

  if v_user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  update public.connected_account ca
    set revoked_at = now(), is_primary = false
  where ca.id = p_account_id;

  delete from public.connected_account_secret cas
  where cas.account_id = p_account_id;

  if v_was_primary then
    select ca.id into v_new_primary
    from public.connected_account ca
    where ca.user_id = v_user_id
      and ca.platform = v_platform
      and ca.revoked_at is null
    order by ca.connected_at asc
    limit 1;

    if v_new_primary is not null then
      perform public.set_connected_account_primary(v_new_primary);
    end if;
  end if;
end;
$$;

grant execute on function public.revoke_connected_account(uuid) to authenticated;

