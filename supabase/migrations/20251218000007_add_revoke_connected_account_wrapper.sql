/*
  Add a compatibility wrapper for revoke_connected_account(account_id uuid)
  that delegates to the unambiguous p_account_id version.
*/

drop function if exists public.revoke_connected_account(account_id uuid);

create or replace function public.revoke_connected_account(account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.revoke_connected_account(p_account_id := account_id);
end;
$$;

grant execute on function public.revoke_connected_account(uuid) to authenticated;

