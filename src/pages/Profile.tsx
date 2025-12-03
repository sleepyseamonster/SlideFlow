import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createCheckoutSession } from '../lib/stripe';
import Navbar from '../components/Navbar';
import {
  User,
  Crown,
  CreditCard,
  Settings,
  Check,
  Sparkles,
  Instagram
} from 'lucide-react';

export default function Profile() {
  const { user, updateUser, connectInstagram } = useAuth();
  const navigate = useNavigate();
  const [editableName, setEditableName] = useState(user?.name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [connectingInstagram, setConnectingInstagram] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState(false);

  const handleUpgradeToPremium = async () => {
    if (!user) return;

    setUpgradingPlan(true);
    try {
      const { url, error } = await createCheckoutSession(user.id);
      if (error) {
        alert('Failed to start checkout. Please try again.');
        return;
      }
      if (url) {
        window.location.href = url;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout. Please try again.';
      alert(message);
    } finally {
      setUpgradingPlan(false);
    }
  };

  const handleUpdateName = () => {
    if (user && editableName.trim()) {
      updateUser({ name: editableName.trim() });
      setIsEditingName(false);
    }
  };

  const handleCancelEdit = () => {
    setEditableName(user?.name || '');
    setIsEditingName(false);
  };

  const handleConnectInstagram = async () => {
    setConnectingInstagram(true);
    try {
      await connectInstagram();
    } catch (error: unknown) {
      console.error('Failed to connect Instagram:', error);
    } finally {
      setConnectingInstagram(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <Navbar />
      
      <main className="pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            <p className="text-vanilla/70">Manage your account and subscription</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Sidebar */}
            <div className="sf-card p-6 space-y-4">
              <div className="text-center">
                <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-charcoal/50">
                  <User className="h-10 w-10 text-pacific" />
                </div>
                <h2 className="text-xl font-semibold">{user.name}</h2>
                <p className="text-vanilla/70">{user.email}</p>
                <div className="mt-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold border ${
                    user.plan === 'premium' ? 'border-pacific/60 bg-pacific/15 text-vanilla' : 'border-charcoal/50 text-vanilla/80'
                  }`}>
                    {user.plan === 'premium' && <Crown className="h-4 w-4 mr-1" />}
                    {user.plan === 'premium' ? 'Premium' : 'Free Plan'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <button className="w-full flex items-center px-3 py-2 text-left bg-surface text-vanilla rounded-md border border-charcoal/50">
                  <Settings className="h-5 w-5 mr-3" />
                  Account Settings
                </button>
                <button 
                  onClick={() => navigate('/billing')}
                  className="w-full flex items-center px-3 py-2 text-left text-vanilla/80 hover:text-vanilla rounded-md border border-charcoal/50 hover:bg-surface"
                >
                  <CreditCard className="h-5 w-5 mr-3" />
                  Billing & Plans
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Account Info */}
              <div className="sf-card p-6 space-y-4">
                <h3 className="text-lg font-semibold">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-vanilla/80">
                      Full Name
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={editableName}
                        onChange={(e) => setEditableName(e.target.value)}
                        disabled={!isEditingName}
                        className={`flex-1 px-3 py-2 border border-charcoal/50 rounded-md bg-surface focus:ring-2 focus:ring-pacific focus:border-pacific ${
                          !isEditingName ? 'opacity-80' : ''
                        }`}
                      />
                      {!isEditingName ? (
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="px-3 py-2 bg-surface-alt hover:bg-surface text-vanilla rounded-md border border-charcoal/50 transition-colors"
                        >
                          Edit
                        </button>
                      ) : (
                        <div className="flex space-x-1">
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
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-vanilla/80">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      className="w-full px-3 py-2 border border-charcoal/50 rounded-md bg-surface focus:ring-2 focus:ring-pacific focus:border-pacific"
                    />
                  </div>
                </div>
              </div>

              {/* Instagram Connection */}
              <div className="sf-card p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pacific/15 rounded-md">
                    <Instagram className="h-5 w-5 text-pacific" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Instagram Integration</h3>
                    <p className="text-vanilla/70">Connect Instagram to enable auto-posting.</p>
                  </div>
                </div>
                {user.instagramConnected ? (
                  <div className="bg-surface rounded-md border border-charcoal/50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-pacific/15 rounded-md">
                        <Check className="h-5 w-5 text-pacific" />
                      </div>
                      <div>
                        <p className="font-medium">Instagram Business Connected</p>
                        <p className="text-sm text-vanilla/70">You can now auto-post carousels to Instagram</p>
                      </div>
                    </div>
                    <Check className="h-6 w-6 text-pacific" />
                  </div>
                ) : (
                  <div className="bg-surface rounded-md border border-charcoal/50 p-4 space-y-3">
                    <p className="text-sm text-vanilla/70">Connect your Instagram Business account to schedule and publish directly.</p>
                    <button
                      onClick={handleConnectInstagram}
                      disabled={connectingInstagram}
                      className="sf-btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {connectingInstagram ? 'Connecting...' : 'Connect Instagram'}
                    </button>
                  </div>
                )}
              </div>

              {/* Plan Upgrade */}
              <div className="sf-card p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-pacific" />
                  <h3 className="text-lg font-semibold">Upgrade to Premium</h3>
                </div>
                <p className="text-vanilla/70">Unlock unlimited generations, caption AI, and team collaboration.</p>
                <button
                  onClick={handleUpgradeToPremium}
                  disabled={upgradingPlan}
                  className="sf-btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {upgradingPlan ? 'Starting checkout...' : 'Upgrade for $9/mo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
