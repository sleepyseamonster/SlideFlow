# Credit System Plan

This plan introduces a first-class credit system aligned with `docs/ai_credit_pricing.md` so we can provision plans (Free, Starter, Creator, Studio), allocate monthly credits, sell packs, and log usage.

## Goals
- Track credit balances per user with clear buckets: subscription (resets monthly), purchased (never expires), and bonus.
- Provide an auditable ledger for every credit change (usage, grant, expiration).
- Expose simple client helpers to show current balance, warn before AI actions, and block when insufficient.
- Support manual admin adjustments (e.g., grant 300 credits to Kirk Artman) until Stripe wiring is ready.

## Proposed Schema (Supabase)
- `user_credit_balances`
  - `user_id uuid primary key references auth.users`
  - `subscription_balance integer not null default 0` (resets monthly)
  - `purchased_balance integer not null default 0`
  - `bonus_balance integer not null default 0`
  - `updated_at timestamptz default now()`
- `credit_ledger`
  - `id uuid primary key default gen_random_uuid()`
  - `user_id uuid references auth.users`
  - `change_type text check in ('usage','grant_subscription','grant_purchase','grant_bonus','expiration','manual_adjust')`
  - `credits integer not null` (positive for grants, negative for usage)
  - `action_type text` (e.g., `background_remove`, `generate_caption`, `pack_purchase_1000`)
  - `meta jsonb` (provider cost, model, carousel_id, pack price, notes)
  - `created_at timestamptz default now()`
- `subscription_cycles`
  - `user_id uuid references auth.users`
  - `plan text` (`free`, `starter`, `creator`, `studio`)
  - `renewal_at timestamptz` (next reset moment)
  - `monthly_allocation integer` (e.g., 900/3200/9000)
  - `stripe_subscription_id text` (nullable)
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`
- RLS: balances + ledger rows are owner-readable; service role can manage all.

## Plan Credit Anchors (from AI credits doc)
- Free: 0 (trial-only), Starter: 900, Creator: 3,200, Studio: 9,000 per month.
- Packs: $10/1,000, $20/2,200, $50/5,750, $100/12,000 (bonus baked in).

## Flows
1) **Plan change**: set `plan`, set `monthly_allocation`, set/advance `renewal_at`, upsert `user_credit_balances` (grant subscription balance), ledger `grant_subscription`.
2) **Monthly reset**: cron/Edge Function walks `subscription_cycles` where `renewal_at <= now()`, zeroes `subscription_balance`, grants fresh monthly allocation, advances `renewal_at` by 1 month, ledger entries for expiration + new grant.
3) **Pack purchase**: add to `purchased_balance`, ledger `grant_purchase` with pack id/price.
4) **Usage**: client requests credit reservation; server deducts from `subscription_balance` first, then `purchased_balance`, then `bonus_balance` (in that order), ledger `usage` with tool + provider cost.
5) **Admin grant** (e.g., Kirk): ledger `manual_adjust`, bump `bonus_balance` or `purchased_balance`.

## Client Surfacing
- Extend `profiles` or a lightweight `/me/credits` RPC to return plan, balances, and next renewal.
- In `AuthContext`, include `plan: 'free' | 'starter' | 'creator' | 'studio'` and `credits` (sum + buckets).
- UI: show balance + renewal date in Billing and in AI tool warnings; block actions when total credits <= 0.

## One-off setup for Kirk Artman (`kirkartman00@gmail.com`)
- Desired state: plan `creator`, grant 300 credits now.
- SQL (run in Supabase SQL editor or migration once schema exists):
  ```sql
  -- Ensure a balance row exists
  insert into user_credit_balances (user_id, subscription_balance, purchased_balance, bonus_balance)
  select id, 0, 0, 0 from auth.users where email = 'kirkartman00@gmail.com'
  on conflict (user_id) do nothing;

  -- Set plan + cycle (Creator = 3,200 monthly)
  insert into subscription_cycles (user_id, plan, renewal_at, monthly_allocation)
  select id, 'creator', now() + interval '1 month', 3200 from auth.users where email = 'kirkartman00@gmail.com'
  on conflict (user_id) do update set plan = excluded.plan, monthly_allocation = excluded.monthly_allocation;

  -- Grant 300 bonus credits immediately
  update user_credit_balances b
    set bonus_balance = bonus_balance + 300,
        updated_at = now()
  from auth.users u
  where b.user_id = u.id and u.email = 'kirkartman00@gmail.com';

  insert into credit_ledger (user_id, change_type, credits, action_type, meta)
  select id, 'manual_adjust', 300, 'admin_grant', jsonb_build_object('note','Grant 300 credits for Creator onboarding')
  from auth.users where email = 'kirkartman00@gmail.com';
  ```

## Implementation Steps (priority)
1) Ship migrations for the three tables + policies.
2) Add a service Edge Function or RPC: `get_credits` (returns balances + renewal), `spend_credits` (atomic deduction + ledger), `grant_plan_cycle` (for monthly reset).
3) Update `AuthContext` to include plan + credit summary; show in Billing/Studio/Generate.
4) Add admin tooling (even simple SQL page) to grant packs/bonuses and switch plans.
5) Wire Stripe webhooks to call `grant_plan_cycle` and `grant_purchase`.

