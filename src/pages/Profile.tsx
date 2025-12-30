import React, { useEffect, useState } from 'react';
import { Mail, User } from 'lucide-react';
import ProfileShell from '../components/ProfileShell';
import { useAuth } from '../contexts/useAuth';
import { PLAN_LABELS } from '../lib/plans';

export default function Profile() {
  const { user, updateUser } = useAuth();

  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'User';
  const [nameInput, setNameInput] = useState(displayName);
  const initials = displayName.slice(0, 2).toUpperCase();
  const planLabel = user ? PLAN_LABELS[user.plan] ?? 'Free' : 'Free';
  const canSave = nameInput.trim() && nameInput.trim() !== displayName;

  useEffect(() => {
    setNameInput(displayName);
  }, [displayName]);

  const handleSave = () => {
    if (!canSave) return;
    updateUser({ name: nameInput.trim() });
  };

  if (!user) return null;

  return (
    <ProfileShell
      active="profile"
      title="Profile & presence"
      description="Control your workspace identity, avatar, and how you show up across dashboards."
      hideNavbar
    >
      <div className="space-y-5 max-w-6xl">
        <div className="rounded-2xl border border-charcoal/60 bg-surface/90 shadow-soft p-6 space-y-4 w-full">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-ink border border-charcoal/60 flex items-center justify-center text-lg font-semibold text-pacific">
              {initials}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <User className="h-5 w-5 text-pacific" />
                <span>{displayName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-vanilla/70">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <span className="sf-pill text-[11px] px-2 py-1 bg-pacific/20 border-pacific/60 text-pacific">
                {planLabel} Plan
              </span>
            </div>
          </div>

          <div className="border-t border-charcoal/60 pt-4">
            <p className="text-sm font-semibold mb-1">Upload a profile photo</p>
            <p className="text-xs text-vanilla/60">JPG or PNG · Square works best</p>
          </div>
        </div>

        <div className="rounded-2xl border border-charcoal/60 bg-surface/90 shadow-soft p-6 space-y-4 w-full">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Edit Profile</h2>
            <p className="text-sm text-vanilla/70">Display name</p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full rounded-md border border-charcoal/60 bg-ink/70 px-4 py-3 text-vanilla focus:outline-none focus:ring-2 focus:ring-pacific/70 focus:border-pacific/70"
            />
            <button
              type="button"
              disabled={!canSave}
              onClick={handleSave}
              className="w-full rounded-md bg-gradient-to-r from-pacific to-slate text-vanilla font-semibold py-3 shadow-soft hover:from-pacific-deep hover:to-slate transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </ProfileShell>
  );
}
