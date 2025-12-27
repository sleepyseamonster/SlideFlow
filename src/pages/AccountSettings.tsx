import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import { PLAN_LABELS } from '../lib/plans';
import { User, Crown } from 'lucide-react';

type ConnectedAccount = {
  id: string;
  ig_user_id: string;
  ig_username: string | null;
  page_id: string;
  page_name: string | null;
  is_primary: boolean;
  connected_at: string;
};

export default function AccountSettings() {
  const { user, updateUser, connectInstagram, refreshUser } = useAuth();
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(user?.email || '');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editableName, setEditableName] = useState(user?.name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [connectingInstagram, setConnectingInstagram] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [loadingConnectedAccounts, setLoadingConnectedAccounts] = useState(false);
  const [connectedAccountsError, setConnectedAccountsError] = useState<string | null>(null);
  const [updatingAccountId, setUpdatingAccountId] = useState<string | null>(null);
  const [disconnectingAccountId, setDisconnectingAccountId] = useState<string | null>(null);
  const [disconnectModalAccount, setDisconnectModalAccount] = useState<ConnectedAccount | null>(null);

  const handleUpdateName = () => {
    if (editableName.trim()) {
      updateUser({ name: editableName.trim() });
      setIsEditingName(false);
    }
  };

  const handleCancelEdit = () => {
    setEditableName(user.name || '');
    setIsEditingName(false);
  };

  const loadConnectedAccounts = useCallback(async () => {
    setLoadingConnectedAccounts(true);
    setConnectedAccountsError(null);
    try {
      const { data, error } = await supabase
        .from('connected_account')
        .select('id, ig_user_id, ig_username, page_id, page_name, is_primary, connected_at')
        .eq('platform', 'instagram')
        .is('revoked_at', null)
        .order('connected_at', { ascending: true });

      if (error) throw error;
      setConnectedAccounts((data as ConnectedAccount[]) || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load connected accounts.';
      setConnectedAccountsError(msg);
      setConnectedAccounts([]);
    } finally {
      setLoadingConnectedAccounts(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadConnectedAccounts();
  }, [loadConnectedAccounts, user?.id]);

  useEffect(() => {
    if (!editingEmail) {
      setEmailDraft(user?.email || '');
    }
  }, [user?.email, editingEmail]);

  const handleConnectInstagram = async () => {
    setConnectingInstagram(true);
    const result = await connectInstagram();
    if (!result.ok) {
      alert(result.error || 'Failed to start Meta connection. Please try again.');
      setConnectingInstagram(false);
      return;
    }
  };

  const handleSetDefaultAccount = async (accountId: string) => {
    setUpdatingAccountId(accountId);
    try {
      const { error } = await supabase.rpc('set_connected_account_primary', { account_id: accountId });
      if (error) throw error;
      await loadConnectedAccounts();
      await refreshUser();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update default account.';
      alert(msg);
    } finally {
      setUpdatingAccountId(null);
    }
  };

  const handleDisconnectAccount = async (accountId: string) => {
    setDisconnectingAccountId(accountId);
    try {
      const { error } = await supabase.rpc('revoke_connected_account', { account_id: accountId });
      if (error) throw error;
      await loadConnectedAccounts();
      await refreshUser();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to disconnect account.';
      alert(msg);
    } finally {
      setDisconnectingAccountId(null);
    }
  };

  const handleStartEditEmail = () => {
    setEmailStatus(null);
    setEditingEmail(true);
  };

  const handleCancelEmailEdit = () => {
    setEmailDraft(user?.email || '');
    setEditingEmail(false);
  };

  const handleSaveEmail = async () => {
    if (!user) return;
    if (!emailDraft.trim() || emailDraft === user.email) {
      setEditingEmail(false);
      return;
    }
    setUpdatingEmail(true);
    setEmailStatus(null);
    const { data, error } = await supabase.auth.updateUser({ email: emailDraft.trim() });
    if (error) {
      setEmailStatus({ type: 'error', text: error.message });
      setUpdatingEmail(false);
      return;
    }
    updateUser({ email: data.email || user.email });
    setEmailStatus({
      type: 'success',
      text: 'Email updated—confirm via the link we sent you.',
    });
    setEditingEmail(false);
    setUpdatingEmail(false);
  };

  if (!user) return null;

  const hasMetaConnection = user.instagramConnected || connectedAccounts.length > 0;
  const planLabel = PLAN_LABELS[user.plan] ?? 'Free';
  const isPaidPlan = user.plan !== 'free';
  const primaryAccount = connectedAccounts.find((account) => account.is_primary) || null;
  const primaryInstagramLabel =
    primaryAccount?.ig_username
      ? `@${primaryAccount.ig_username}`
      : primaryAccount?.ig_user_id || (user.instagramUsername ? `@${user.instagramUsername}` : null);
  const primaryFacebookLabel =
    primaryAccount?.page_name || primaryAccount?.page_id || user.facebookPageName || null;
  const primaryDestinationParts: string[] = [];
  if (primaryInstagramLabel) primaryDestinationParts.push(primaryInstagramLabel);
  if (primaryFacebookLabel) primaryDestinationParts.push(primaryFacebookLabel);
  const primaryDestinationLabel = primaryDestinationParts.length
    ? primaryDestinationParts.join(' - ')
    : 'Not set';
  const platformsLabel = hasMetaConnection ? 'Meta (Instagram, Facebook)' : 'Not connected';
  const navButtons = [
    { label: 'Account Settings', to: '/account-settings', active: true },
    { label: 'Billing & Plans', to: '/billing', active: false },
  ];
  const navButtonClasses = (active: boolean) =>
    `flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors ${
      active
        ? 'border-pacific/70 bg-pacific/15 text-vanilla'
        : 'border-charcoal/50 text-vanilla/75 hover:bg-surface-muted'
    }`;

  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <Navbar />

      <main className="pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-pacific hover:text-vanilla font-semibold"
          >
            <span className="h-8 w-8 rounded-full bg-pacific/15 border border-pacific/40 flex items-center justify-center text-sm font-bold text-pacific">
              ←
            </span>
            Back to Dashboard
          </Link>

          <div className="space-y-1">
            <h1 className="text-3xl font-semibold">Account Settings</h1>
            <p className="text-vanilla/70">Update your identity details and login information.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.25fr_2.75fr]">
            <aside className="sf-card p-6 flex flex-col min-h-[520px] border border-charcoal/60 bg-surface/70">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-ink rounded-2xl flex items-center justify-center border border-charcoal/60">
                    <User className="h-8 w-8 text-pacific" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold">{user.name || user.email.split('@')[0]}</p>
                    <p className="text-sm text-vanilla/70">{user.email}</p>
                    <div
                      className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-3 py-1 ${
                        isPaidPlan ? 'bg-pacific/15 border border-pacific/60 text-pacific' : 'bg-surface border border-charcoal/40 text-vanilla/80'
                      }`}
                    >
                      {isPaidPlan && <Crown className="h-3.5 w-3.5" />}
                      {isPaidPlan ? planLabel : 'Free Plan'}
                    </div>
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  {navButtons.map((button) =>
                    button.active ? (
                      <span
                        key={`nav-${button.label}`}
                        className={navButtonClasses(true)}
                        aria-current="page"
                      >
                        {button.label}
                      </span>
                    ) : (
                      <Link key={`nav-${button.label}`} to={button.to!} className={navButtonClasses(false)}>
                        {button.label}
                      </Link>
                    )
                  )}
                </div>
              </div>
            </aside>

            <div className="space-y-6">
              <div className="sf-card p-6 space-y-4" id="profile-details">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Profile details</h2>
                  <p className="text-vanilla/70">
                    Billing and plan changes live in Billing & Plans.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-vanilla/60">
                      Full name
                    </label>
                    {isEditingName ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editableName}
                          onChange={(e) => setEditableName(e.target.value)}
                          className="w-full px-3 py-2 border border-charcoal/50 rounded-md bg-surface focus:ring-2 focus:ring-pacific focus:border-pacific"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleUpdateName}
                            className="px-3 py-2 bg-pacific text-vanilla rounded-md transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-2 bg-surface-alt hover:bg-surface text-vanilla rounded-md border border-charcoal/50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3 rounded-md border border-charcoal/50 bg-surface px-3 py-2">
                        <span className="font-medium">{user.name || 'Add your name'}</span>
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="px-3 py-2 bg-surface-alt hover:bg-surface text-vanilla rounded-md border border-charcoal/50 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-vanilla/60">
                      Email address
                    </label>
                    {editingEmail ? (
                      <div className="space-y-2">
                        <input
                          type="email"
                          value={emailDraft}
                          onChange={(e) => setEmailDraft(e.target.value)}
                          disabled={updatingEmail}
                          className="w-full px-3 py-2 border border-charcoal/50 rounded-md bg-surface focus:ring-2 focus:ring-pacific focus:border-pacific text-sm font-medium"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSaveEmail}
                            disabled={updatingEmail}
                            className="sf-btn-primary text-sm px-4 py-2"
                          >
                            {updatingEmail ? 'Saving…' : 'Save email'}
                          </button>
                          <button
                            onClick={handleCancelEmailEdit}
                            disabled={updatingEmail}
                            className="px-4 py-2 rounded-md border border-charcoal/50 text-sm text-vanilla/80 hover:border-pacific/70"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3 rounded-md border border-charcoal/50 bg-surface px-3 py-2">
                        <span className="text-sm font-medium">{user.email}</span>
                        <button
                          onClick={handleStartEditEmail}
                          className="px-3 py-2 rounded-md bg-pacific/10 text-pacific font-semibold text-sm border border-pacific/60"
                        >
                          Change email
                        </button>
                      </div>
                    )}
                    {emailStatus && (
                      <p
                        className={`text-xs ${
                          emailStatus.type === 'success' ? 'text-emerald-300' : 'text-red-300'
                        }`}
                      >
                        {emailStatus.text}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="sf-card p-6 space-y-4">
                <h2 className="text-lg font-semibold">Publishing Identity</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-vanilla/60">Platforms</span>
                    <span className="text-right">{platformsLabel}</span>
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-vanilla/60">Default destination</span>
                    <span className="text-right font-semibold">
                      {primaryDestinationLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-vanilla/60">Publishing mode</span>
                    <span className="text-right">Manual approval</span>
                  </div>
                </div>
              </div>

              <div className="sf-card p-6 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Meta connections</h2>
                    <p className="text-vanilla/70">Manage Instagram and Facebook destinations.</p>
                  </div>
                  {hasMetaConnection && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleConnectInstagram}
                        disabled={connectingInstagram}
                        className="px-3 py-2 rounded-md bg-surface-alt hover:bg-surface text-vanilla border border-charcoal/50 transition-colors disabled:opacity-60"
                      >
                        {connectingInstagram ? 'Opening Meta...' : 'Connect another'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void loadConnectedAccounts()}
                        className="px-3 py-2 rounded-md bg-transparent hover:bg-surface text-vanilla/80 hover:text-vanilla border border-charcoal/50 transition-colors disabled:opacity-60 text-xs"
                        disabled={loadingConnectedAccounts}
                      >
                        {loadingConnectedAccounts ? 'Refreshing...' : 'Refresh'}
                      </button>
                    </div>
                  )}
                </div>

                {loadingConnectedAccounts ? (
                  <p className="text-sm text-vanilla/70">Loading connected accounts...</p>
                ) : connectedAccountsError ? (
                  <p className="text-sm text-red-300">{connectedAccountsError}</p>
                ) : connectedAccounts.length === 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-vanilla/70">No destinations connected.</p>
                    <button
                      onClick={handleConnectInstagram}
                      disabled={connectingInstagram}
                      className="sf-btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {connectingInstagram ? 'Connecting...' : 'Connect to Meta'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {connectedAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-md border border-charcoal/50 bg-ink/40 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">
                              Instagram {account.ig_username ? `@${account.ig_username}` : account.ig_user_id}
                            </p>
                            {account.is_primary && (
                              <span className="text-[11px] px-2 py-0.5 rounded-md border border-pacific/40 bg-pacific/15 text-vanilla">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-vanilla/70 truncate">
                            Facebook Page: {account.page_name || account.page_id}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 md:justify-end">
                          {!account.is_primary && (
                            <button
                              type="button"
                              onClick={() => void handleSetDefaultAccount(account.id)}
                              disabled={updatingAccountId === account.id}
                              className="px-3 py-2 rounded-md bg-surface-alt hover:bg-surface text-vanilla border border-charcoal/50 transition-colors disabled:opacity-60"
                            >
                              {updatingAccountId === account.id ? 'Updating...' : 'Set as default'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDisconnectModalAccount(account)}
                            disabled={disconnectingAccountId === account.id}
                            className="px-3 py-2 rounded-md border border-red-500/40 text-red-200 hover:bg-red-500/10 transition-colors disabled:opacity-60"
                          >
                            {disconnectingAccountId === account.id ? 'Disconnecting...' : 'Disconnect'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {disconnectModalAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-ink border border-charcoal/60 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Disconnect Meta</h3>
              <p className="text-sm text-vanilla/70">
                Instagram {disconnectModalAccount.ig_username ? `@${disconnectModalAccount.ig_username}` : disconnectModalAccount.ig_user_id}
              </p>
              <p className="text-xs text-vanilla/60">
                Facebook Page: {disconnectModalAccount.page_name || disconnectModalAccount.page_id}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-md border border-charcoal/60 bg-surface text-vanilla/80 hover:text-vanilla"
                onClick={() => setDisconnectModalAccount(null)}
                disabled={disconnectingAccountId === disconnectModalAccount.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-md bg-pacific text-vanilla hover:bg-pacific/90 disabled:opacity-60"
                disabled={disconnectingAccountId === disconnectModalAccount.id}
                onClick={() => {
                  void handleDisconnectAccount(disconnectModalAccount.id);
                  setDisconnectModalAccount(null);
                }}
              >
                {disconnectingAccountId === disconnectModalAccount.id ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
