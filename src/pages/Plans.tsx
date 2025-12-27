import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { PLAN_OPTIONS, PLAN_MAX_CAROUSELS, type PlanKey } from '../lib/plans';
import { ArrowLeft } from 'lucide-react';

const PLAN_USAGE_HINT: Record<PlanKey, string> = {
  free: 'Best for testing the workflow.',
  starter: 'Fits a couple of carousels each week.',
  creator: 'Sized for weekly publishing with room to experiment.',
  studio: 'Built for teams shipping multiple carousels a week.',
};

export default function Plans() {
  const { user, updateUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(user?.plan || 'free');

  const planMap = useMemo(
    () => Object.fromEntries(PLAN_OPTIONS.map((plan) => [plan.key, plan] as const)),
    []
  );
  const userPlan = user ? planMap[user.plan] ?? PLAN_OPTIONS[0] : PLAN_OPTIONS[0];

  const handleSelectPlan = (planKey: PlanKey) => {
    setSelectedPlan(planKey);
    updateUser({
      plan: planKey,
      maxCarousels: PLAN_MAX_CAROUSELS[planKey],
    });
    if (planKey !== 'free') {
      alert('We will confirm payment details before any charges. Checkout opens soon.');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <Navbar />
      <main className="pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="space-y-2">
            <Link
              to="/billing"
              className="inline-flex items-center text-pacific hover:text-vanilla font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Billing & Usage
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Plans & Pricing</h1>
              <p className="text-vanilla/70">
                Choose the rhythm that fits your publishing. Plan changes are safe and confirmed before billing.
              </p>
            </div>
          </div>

          <section className="space-y-3">
            <p className="text-sm text-vanilla/70">
              All plans include monthly credits that reset at renewal. Optional packs never expire.
            </p>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
              {PLAN_OPTIONS.map((plan) => {
                const isPopular = plan.tone === 'popular';
                const isPremium = plan.tone === 'premium';
                const isMuted = plan.tone === 'muted';
                const isCurrent = user.plan === plan.key;
                const cardClass = isPremium
                  ? 'relative overflow-hidden rounded-xl p-7 shadow-soft border border-pacific/40 bg-gradient-to-br from-ink via-surface-alt to-pacific/40 text-vanilla'
                  : isPopular
                  ? 'relative overflow-hidden rounded-xl p-7 shadow-soft border border-pacific/60 bg-gradient-to-br from-pacific via-pacific-deep to-slate text-vanilla'
                  : isMuted
                  ? 'sf-card p-7 bg-surface/70 text-vanilla/80'
                  : 'sf-card p-7';
                const badgeClass = isPremium
                  ? 'bg-ink/60 text-vanilla border border-vanilla/20'
                  : isPopular
                  ? 'bg-ink/30 text-vanilla border border-vanilla/30'
                  : 'bg-surface text-vanilla/70';
                return (
                  <div key={plan.key} className={cardClass}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold">{plan.name}</h3>
                        <p className={`text-sm ${isPremium || isPopular ? 'text-vanilla/85' : 'text-vanilla/70'}`}>
                          {plan.key === 'free' ? 'Enough credits to generate a full carousel.' : plan.description}
                        </p>
                        <p className="text-xs text-vanilla/60 mt-1">{PLAN_USAGE_HINT[plan.key]}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-sm text-xs font-semibold ${badgeClass}`}>
                        {isCurrent ? 'Active' : plan.badge}
                      </span>
                    </div>
                    <div className="mb-5">
                      <span className="text-4xl font-bold text-vanilla">{plan.price}</span>
                      <span className={`ml-2 ${isPremium || isPopular ? 'text-vanilla/80' : 'text-vanilla/70'}`}>
                        {plan.cadence}
                      </span>
                      <div className={`text-sm mt-2 ${isPremium || isPopular ? 'text-vanilla/80' : 'text-vanilla/70'}`}>
                        {plan.creditsLabel}
                      </div>
                    </div>
                    <ul className={`space-y-3 mb-6 ${isPremium || isPopular ? 'text-vanilla/90' : 'text-vanilla/80'}`}>
                      {plan.features
                        .filter((feature) => feature !== 'Best value per credit')
                        .map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <span
                              className={`mt-2 h-2 w-2 rounded-full ${
                                plan.key === 'studio'
                                  ? 'bg-pacific'
                                  : isPopular
                                  ? 'bg-vanilla/90'
                                  : 'bg-pacific'
                              }`}
                            ></span>
                            <span>{feature}</span>
                          </li>
                        ))}
                    </ul>
                    <button
                      onClick={() => handleSelectPlan(plan.key)}
                      disabled={isCurrent}
                      className={`sf-btn-secondary w-full justify-center ${
                        isCurrent
                          ? 'opacity-70 cursor-not-allowed'
                          : isPopular
                          ? 'bg-vanilla/15 hover:bg-vanilla/25 border-vanilla/40 text-vanilla'
                          : isPremium
                          ? 'bg-ink/30 hover:bg-ink/40 border-vanilla/30'
                          : ''
                      }`}
                    >
                      {isCurrent ? `Staying on ${plan.name}` : `Switch to ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="space-y-1 text-center text-sm text-vanilla/70">
              <p>Switch plans anytime. We always confirm before charging.</p>
              <p>You can’t break anything by switching—drafts, media, and settings stay safe. If a plan feels wrong, switching is instant and nothing is lost.</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
