import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, CreditCard, Clock, Download, Info, ShieldCheck, Heart } from 'lucide-react';
import ProfileShell from '../components/ProfileShell';
import { useAuth } from '../contexts/useAuth';
import { PLAN_OPTIONS, PLAN_LABELS, PLAN_MAX_CAROUSELS, CREDIT_PACKS, type PlanKey } from '../lib/plans';

const PLAN_USAGE_HINT: Record<PlanKey, string> = {
  free: 'Best for testing the workflow.',
  starter: 'Fits a couple of carousels each week.',
  creator: 'Sized for weekly publishing with room to experiment.',
  studio: 'Built for teams shipping multiple carousels a week.',
};

function formatRenewal(renewalAt?: string | null) {
  if (!renewalAt) return 'Resets monthly';
  const date = new Date(renewalAt);
  if (Number.isNaN(date.getTime())) return 'Resets monthly';
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (diffDays === 0) return `Resets today (${dateLabel})`;
  if (diffDays === 1) return `Resets in 1 day (${dateLabel})`;
  return `Resets in ${diffDays} days (${dateLabel})`;
}

function getCycleDayLabel(renewalAt?: string | null) {
  if (!renewalAt) return 'Monthly cycle in progress';
  const renewalDate = new Date(renewalAt);
  if (Number.isNaN(renewalDate.getTime())) return 'Monthly cycle in progress';
  const startDate = new Date(renewalDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const today = new Date();
  const dayNumber = Math.min(30, Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1));
  return `Day ${dayNumber} of 30 this cycle`;
}

export default function Billing() {
  const { user } = useAuth();

  const planMap = useMemo(
    () => Object.fromEntries(PLAN_OPTIONS.map((plan) => [plan.key, plan] as const)),
    []
  );
  const userPlan = user ? planMap[user.plan] ?? PLAN_OPTIONS[0] : PLAN_OPTIONS[0];
  const creditsBalance = user?.creditsBalance ?? 0;
  const creditsBuckets = user?.creditsBuckets;
  const renewalLabel = formatRenewal(user?.creditsRenewalAt);
  const cycleDayLabel = getCycleDayLabel(user?.creditsRenewalAt);
  const monthlyCredits = userPlan.monthlyCredits || 0;
  const monthlyRemaining = creditsBuckets?.subscription ?? monthlyCredits;
  const packCredits = (creditsBuckets?.purchased ?? 0) + (creditsBuckets?.bonus ?? 0);
  const carouselEquivalent = '~120 credits ≈ 1 carousel (varies by tools used)';
  const isLowCredits = monthlyRemaining <= Math.max(150, Math.round(monthlyCredits * 0.15));
  const usageHealth = userPlan.key === 'free'
    ? 'Trial is limited; choose a plan when ready.'
    : isLowCredits
      ? 'Running low—add a pack or adjust usage.'
      : 'On track this cycle.';
  const carouselLimitLabel =
    PLAN_MAX_CAROUSELS[user.plan] >= 999 ? 'Unlimited' : PLAN_MAX_CAROUSELS[user.plan];

  if (!user) return null;

  return (
    <ProfileShell
      active="billing"
      title="Billing & subscription"
      description="Review your plan, update payment info, and see what’s next on your billing cycle."
      hideNavbar
    >
      <div className="space-y-5">
        <section className="rounded-2xl border border-charcoal/60 bg-surface/90 shadow-soft p-6 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-vanilla/60">Current plan</p>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{PLAN_LABELS[user.plan]}</h2>
                <span className="text-xs px-2 py-1 rounded-md bg-pacific/15 border border-pacific/40 text-pacific">
                  Active
                </span>
              </div>
              <p className="text-sm text-vanilla/75">{userPlan.description}</p>
              <p className="text-xs text-vanilla/60">{PLAN_USAGE_HINT[userPlan.key]}</p>
              <p className="text-xs text-vanilla/60">If you take no action here, nothing changes.</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:text-right">
              <div
                className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                  isLowCredits
                    ? 'bg-amber-500/15 border border-amber-400/50 text-amber-50'
                    : 'bg-emerald-500/15 border border-emerald-400/60 text-emerald-50'
                }`}
              >
                {usageHealth}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{userPlan.price}</p>
                <p className="text-sm text-vanilla/70">{userPlan.cadence}</p>
              </div>
              <Link
                to="/plans"
                className="sf-btn-secondary px-4 py-2 text-sm justify-center"
              >
                View plans & pricing
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-charcoal/60 bg-surface/90 shadow-soft p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-charcoal/60 bg-surface-alt/60 p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-pacific" />
                <span>Credits available</span>
              </div>
              <p className="text-2xl font-bold">{creditsBalance.toLocaleString()}</p>
              <p className="text-xs text-vanilla/60">Total across plan + packs.</p>
            </div>
            <div className="rounded-lg border border-charcoal/60 bg-surface-alt/60 p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Info className="h-4 w-4 text-pacific" />
                <span>Plan credits (this cycle)</span>
              </div>
              <p className="text-2xl font-bold">{monthlyRemaining.toLocaleString()}</p>
              <p className="text-xs text-vanilla/60">
                {cycleDayLabel}. Reset date: {renewalLabel}. Unused plan credits reset.
              </p>
            </div>
            <div className="rounded-lg border border-charcoal/60 bg-surface-alt/60 p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4 text-pacific" />
                <span>Pack credits</span>
              </div>
              <p className="text-xl font-semibold">{packCredits.toLocaleString()}</p>
              <p className="text-xs text-vanilla/60">Purchased + bonus credits. Never expire.</p>
            </div>
            <div className="rounded-lg border border-charcoal/60 bg-surface-alt/60 p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CreditCard className="h-4 w-4 text-pacific" />
                <span>Limits & rhythm</span>
              </div>
              <p className="text-xl font-semibold">{carouselLimitLabel} carousels</p>
              <p className="text-xs text-vanilla/60">{carouselEquivalent}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-charcoal/60 bg-surface/80 shadow-soft p-6 space-y-3">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3 rounded-lg border border-charcoal/60 bg-ink/70 p-3">
              <ShieldCheck className="h-5 w-5 text-emerald-300 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">No surprise charges</p>
                <p className="text-xs text-vanilla/70">Plan price stays fixed; packs are one-time and never expire.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-charcoal/60 bg-ink/70 p-3">
              <Info className="h-5 w-5 text-pacific mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">Changes are reversible</p>
                <p className="text-xs text-vanilla/70">Upgrade or downgrade anytime. Doing nothing keeps your current plan.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-charcoal/60 bg-ink/70 p-3">
              <Heart className="h-5 w-5 text-rose-200 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">Support-ready</p>
                <p className="text-xs text-vanilla/70">If something looks off, reach out before any charge is made.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-charcoal/60 bg-ink/70 p-3">
              <Sparkles className="h-5 w-5 text-pacific mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">Nothing breaks at zero</p>
                <p className="text-xs text-vanilla/70">Your drafts and media stay safe even if credits hit zero.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="credit-packs" className="rounded-2xl border border-charcoal/60 bg-surface/75 shadow-soft p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Credit packs (optional)</h3>
              <p className="text-sm text-vanilla/70">Use only when you need extra room. Packs never expire.</p>
            </div>
            <span className="text-xs text-vanilla/60">Optional</span>
          </div>
          <div className="space-y-2">
            {CREDIT_PACKS.map((pack) => (
              <div
                key={pack.price}
                className="flex items-center justify-between rounded-lg border border-charcoal/50 bg-surface-alt/50 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-vanilla">{pack.price}</p>
                  <p className="text-sm text-vanilla/70">{pack.credits.toLocaleString()} credits</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-vanilla/70">{pack.bonus}</span>
                  <button
                    type="button"
                    className="sf-btn-secondary px-3 py-2 text-sm"
                    onClick={() => alert('We’ll confirm payment before charging you. Checkout opens soon.')}
                  >
                    Purchase
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-vanilla/60">
            Packs are one-time add-ons. They never expire and stay in your balance until you use them.
          </p>
        </section>

        <section className="rounded-2xl border border-charcoal/60 bg-surface/80 shadow-soft p-6 space-y-3">
          <h3 className="text-lg font-semibold">How billing works</h3>
          <ul className="space-y-2 text-sm text-vanilla/75">
            <li>• Plan credits reset each renewal.</li>
            <li>• Packs are optional backup and never expire.</li>
            <li>• We confirm any plan or pack change before charging.</li>
            <li>• Doing nothing keeps your current plan.</li>
          </ul>
          <div className="pt-1">
            <Link
              id="plans-link"
              to="/plans"
              className="text-sm text-pacific hover:text-vanilla underline underline-offset-2"
            >
              View available plans
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-charcoal/60 bg-surface/80 shadow-soft p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Billing details</h3>
              <p className="text-sm text-vanilla/70">Plan renews monthly; packs are one-time.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-charcoal/60 bg-surface-alt/60 p-3 space-y-1">
              <p className="text-xs text-vanilla/60 uppercase tracking-[0.18em]">Price</p>
              <p className="text-xl font-semibold">
                {userPlan.price} {userPlan.cadence}
              </p>
              <p className="text-xs text-vanilla/60">Stays the same unless you change plans.</p>
            </div>
            <div className="rounded-lg border border-charcoal/60 bg-surface-alt/60 p-3 space-y-1">
              <p className="text-xs text-vanilla/60 uppercase tracking-[0.18em]">Next renewal</p>
              <p className="text-xl font-semibold">{renewalLabel}</p>
              <p className="text-xs text-vanilla/60">We’ll confirm before any change.</p>
            </div>
            <div className="rounded-lg border border-charcoal/60 bg-surface-alt/60 p-3 space-y-1">
              <p className="text-xs text-vanilla/60 uppercase tracking-[0.18em]">Payment method</p>
              <p className="text-xl font-semibold">Your payment method is saved</p>
              <p className="text-xs text-vanilla/60">Update or switch at checkout.</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-charcoal/60 bg-surface/75 shadow-soft p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Billing history</h3>
              <p className="text-sm text-vanilla/60">Receipts and invoices will be saved here for easy reference.</p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-md border border-charcoal/60 text-xs text-vanilla/70">
              <CreditCard className="h-4 w-4 mr-1" />
              Receipts email automatically
            </span>
          </div>
          <div className="text-center py-10">
            <Download className="h-10 w-10 text-vanilla/35 mx-auto mb-3" />
            <p className="text-vanilla/70">No payments yet.</p>
            <p className="text-sm text-vanilla/60">After your first payment, receipts will appear here and via email.</p>
          </div>
        </section>

        <div className="border-t border-charcoal/60 pt-6 text-center text-sm text-vanilla/70">
          That’s everything related to billing for now.
        </div>
      </div>
    </ProfileShell>
  );
}
