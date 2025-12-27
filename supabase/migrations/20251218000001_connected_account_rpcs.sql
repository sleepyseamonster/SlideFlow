/*
  # Connected account RPC helpers

  - Enforces a single primary account per user/platform (active rows only).
  - Provides RPCs to set primary and revoke an account safely in a transaction.
*/

create unique index if not exists connected_account_one_primary_active
  on public.connected_account (user_id, platform)
  where is_primary is true and revoked_at is null;

create or replace function public.set_connected_account_primary(account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_platform text;
begin
  select user_id, platform
    into v_user_id, v_platform
  from public.connected_account
  where id = account_id and revoked_at is null;

  if not found then
    raise exception 'connected account not found';
  end if;

  if v_user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  update public.connected_account
    set is_primary = false
  where user_id = v_user_id
    and platform = v_platform
    and revoked_at is null
    and is_primary is true;

  update public.connected_account
    set is_primary = true
  where id = account_id;
end;
$$;

grant execute on function public.set_connected_account_primary(uuid) to authenticated;

create or replace function public.revoke_connected_account(account_id uuid)
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
  where id = account_id and revoked_at is null;

  if not found then
    return;
  end if;

  if v_user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  update public.connected_account
    set revoked_at = now(), is_primary = false
  where id = account_id;

  delete from public.connected_account_secret
  where public.connected_account_secret.account_id = account_id;

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
