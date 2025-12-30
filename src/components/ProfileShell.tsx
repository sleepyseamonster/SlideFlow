import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, CreditCard, LogOut, Shield, UserCircle2, Lock } from 'lucide-react';
import Navbar from './Navbar';
import { useAuth } from '../contexts/useAuth';
import { PLAN_LABELS } from '../lib/plans';

type SectionKey = 'profile' | 'account' | 'billing' | 'subscription';

interface ProfileShellProps {
  active: SectionKey;
  title: string;
  description?: string;
  children: React.ReactNode;
  hideNavbar?: boolean;
}

const NAV_ITEMS: { label: string; to: string; icon: React.ComponentType<{ className?: string }> ; key: SectionKey }[] = [
  { label: 'Profile', to: '/profile', icon: UserCircle2, key: 'profile' },
  { label: 'Account', to: '/account-settings', icon: Shield, key: 'account' },
  { label: 'Billing', to: '/billing', icon: CreditCard, key: 'billing' },
  { label: 'Subscription', to: '/plans', icon: Lock, key: 'subscription' },
];

export function ProfileShell({ active, title, description, children, hideNavbar = false }: ProfileShellProps) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const displayName = user.name || user.email.split('@')[0];
  const initials = displayName.slice(0, 2).toUpperCase();
  const planLabel = PLAN_LABELS[user.plan] ?? 'Free';
  const isPaidPlan = user.plan !== 'free';

  return (
    <div className="min-h-screen bg-ink text-vanilla">
      {!hideNavbar && <Navbar />}
      <main className={`${hideNavbar ? 'pt-4' : 'pt-8'} pb-14 px-4 sm:px-6 lg:px-10`}>
        <aside className="bg-surface/85 border border-charcoal/60 rounded-xl shadow-soft p-5 flex flex-col justify-between gap-4 h-full lg:h-screen lg:fixed lg:inset-y-0 lg:left-0 lg:min-w-[360px] lg:max-w-[460px] lg:w-auto lg:overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-charcoal/60 bg-surface-alt px-3 py-3">
              <div className="h-12 w-12 rounded-full bg-ink flex items-center justify-center border border-charcoal/60 text-lg font-semibold text-pacific">
                {initials}
              </div>
              <div className="space-y-1">
                <p className="font-semibold leading-tight break-words">{displayName}</p>
                <p className="text-xs text-vanilla/70 leading-tight break-words">{user.email}</p>
                <div
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1 ${
                    isPaidPlan ? 'bg-pacific/15 border border-pacific/60 text-pacific' : 'bg-surface border border-charcoal/40 text-vanilla/80'
                  }`}
                >
                  {isPaidPlan && <Crown className="h-3.5 w-3.5" />}
                  {planLabel}
                </div>
              </div>
            </div>

            <Link
              to="/dashboard"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-charcoal/60 bg-surface-alt/70 text-sm font-semibold px-3 py-2 hover:border-pacific/60 hover:text-vanilla transition-colors"
            >
              ← Back to dashboard
            </Link>

            <div className="flex-1 space-y-3 pt-1">
              {NAV_ITEMS.map(({ label, to, icon: Icon, key }) => {
                const isActive = key === active;
                return (
                  <Link
                    key={label}
                    to={to}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'border-pacific/80 bg-pacific/15 text-vanilla'
                        : 'border-charcoal/60 bg-surface-alt hover:border-pacific/50 hover:text-vanilla'
                    }`}
                  >
                    <span className={`h-9 w-9 rounded-md flex items-center justify-center border ${isActive ? 'border-pacific/70 bg-pacific/10' : 'border-charcoal/50 bg-ink/60'}`}>
                      <Icon className={`h-5 w-5 ${isActive ? 'text-pacific' : 'text-vanilla/80'}`} />
                    </span>
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={logout}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-charcoal/60 bg-surface-alt/70 text-sm font-semibold px-3 py-3 hover:border-red-500/60 hover:text-red-100 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </aside>

        <div className="w-full max-w-screen-2xl mx-auto px-4 lg:px-0 lg:pl-[360px]">
          <section className="w-full max-w-[calc(100vw-380px)] mx-auto space-y-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold leading-tight">{title}</h1>
              {description ? <p className="text-vanilla/70">{description}</p> : null}
            </div>
            <div className="space-y-5">{children}</div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default ProfileShell;
