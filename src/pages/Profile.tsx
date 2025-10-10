import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import {
  User,
  Crown,
  CreditCard,
  Settings,
  Check,
  Zap,
  Users,
  Sparkles,
  Instagram
} from 'lucide-react';

export default function Profile() {
  const { user, updateUser, connectInstagram } = useAuth();
  const navigate = useNavigate();
  const [editableName, setEditableName] = useState(user?.name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [connectingInstagram, setConnectingInstagram] = useState(false);

  const handleUpgradeToPremium = () => {
    // Mock Stripe integration
    alert('Redirecting to Stripe checkout... (This is a demo)');
    // In real app, integrate with Stripe
    updateUser({ plan: 'premium', maxCarousels: 999 });
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
    } catch (error) {
      console.error('Failed to connect Instagram:', error);
    } finally {
      setConnectingInstagram(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
            <p className="text-gray-600">Manage your account and subscription</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Sidebar */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-10 w-10 text-indigo-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
                <p className="text-gray-600">{user.email}</p>
                <div className="mt-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    user.plan === 'premium' 
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.plan === 'premium' && <Crown className="h-4 w-4 mr-1" />}
                    {user.plan === 'premium' ? 'Premium' : 'Free Plan'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <button className="w-full flex items-center px-3 py-2 text-left bg-indigo-50 text-indigo-700 rounded-lg">
                  <Settings className="h-5 w-5 mr-3" />
                  Account Settings
                </button>
                <button 
                  onClick={() => navigate('/billing')}
                  className="w-full flex items-center px-3 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  <CreditCard className="h-5 w-5 mr-3" />
                  Billing & Plans
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Account Info */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={editableName}
                        onChange={(e) => setEditableName(e.target.value)}
                        disabled={!isEditingName}
                        className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                          !isEditingName ? 'bg-gray-50' : ''
                        }`}
                      />
                      {!isEditingName ? (
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                      ) : (
                        <div className="flex space-x-1">
                          <button
                            onClick={handleUpdateName}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Instagram Connection */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Instagram Integration</h3>
                {user.instagramConnected ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Instagram className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">Instagram Business Connected</p>
                          <p className="text-sm text-gray-600">You can now auto-post carousels to Instagram</p>
                        </div>
                      </div>
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Instagram className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">Connect Instagram Business</p>
                          <p className="text-sm text-gray-600">Auto-share your carousels to Instagram</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleConnectInstagram}
                      disabled={connectingInstagram}
                      className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white py-3 px-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {connectingInstagram ? 'Connecting...' : 'Connect Instagram Business Account'}
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Requires an Instagram Business or Creator account linked to Facebook
                    </p>
                  </div>
                )}
              </div>

              {/* Usage Stats */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Usage Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        <Zap className="h-5 w-5 text-teal-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-600">Carousels Generated</p>
                        <p className="text-xl font-bold text-gray-900">
                          {user.carouselsGenerated} / {user.maxCarousels === 999 ? '∞' : user.maxCarousels}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Crown className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-600">Plan Status</p>
                        <p className="text-xl font-bold text-gray-900 capitalize">{user.plan}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plan Upgrade */}
              {user.plan === 'free' && (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold mb-2">Upgrade to Premium</h3>
                      <p className="text-indigo-100 mb-4">
                        Unlock unlimited generations and premium features
                      </p>
                      <ul className="space-y-2 mb-6">
                        <li className="flex items-center text-sm">
                          <Check className="h-4 w-4 mr-2 text-teal-300" />
                          Unlimited carousel generations
                        </li>
                        <li className="flex items-center text-sm">
                          <Check className="h-4 w-4 mr-2 text-teal-300" />
                          AI Instagram caption generator
                        </li>
                        <li className="flex items-center text-sm">
                          <Check className="h-4 w-4 mr-2 text-teal-300" />
                          Team sharing & collaboration
                        </li>
                        <li className="flex items-center text-sm">
                          <Check className="h-4 w-4 mr-2 text-teal-300" />
                          Priority customer support
                        </li>
                      </ul>
                      <button
                        onClick={handleUpgradeToPremium}
                        className="bg-white hover:bg-gray-100 text-indigo-600 px-6 py-3 rounded-xl font-semibold transition-colors transform hover:scale-105 hover:shadow-lg"
                      >
                        Upgrade for $9/month
                      </button>
                    </div>
                    <Sparkles className="h-8 w-8 text-teal-300" />
                  </div>
                </div>
              )}

              {/* Billing Info (Premium Users) */}
              {user.plan === 'premium' && showBilling && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Billing Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Premium Plan</p>
                        <p className="text-sm text-gray-600">Next billing: January 15, 2024</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">$9.00</p>
                        <p className="text-sm text-gray-600">per month</p>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors">
                        Update Payment
                      </button>
                      <button className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg font-medium transition-colors">
                        Cancel Plan
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}