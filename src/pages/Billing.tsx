import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import {
  ArrowLeft,
  CreditCard,
  Check,
  Crown,
  Calendar,
  AlertCircle,
  Download
} from 'lucide-react';

export default function Billing() {
  const { user, updateUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(user?.plan || 'free');

  const handleUpgradeToPremium = () => {
    alert('Redirecting to Stripe checkout... (This is a demo)');
    updateUser({ plan: 'premium', maxCarousels: 999 });
    setSelectedPlan('premium');
  };

  const handleDowngradePlan = () => {
    if (confirm('Are you sure you want to downgrade to the free plan? You will lose access to premium features.')) {
      updateUser({ plan: 'free', maxCarousels: 1 });
      setSelectedPlan('free');
    }
  };

  if (!user) return null;

  const isPremium = selectedPlan === 'premium' || user.plan === 'premium';

  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <Navbar />
      
      <main className="pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 space-y-2">
            <Link 
              to="/profile" 
              className="inline-flex items-center text-pacific hover:text-vanilla font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Billing & Plans</h1>
              <p className="text-vanilla/70">Manage your subscription and billing information</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Current Plan */}
            <div className="lg:col-span-2 space-y-6">
              <div className="sf-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Current Plan</h2>
                  <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold border ${
                    isPremium ? 'border-pacific/60 text-vanilla bg-pacific/15' : 'border-charcoal/50 text-vanilla/80 bg-surface'
                  }`}>
                    {isPremium && <Crown className="h-4 w-4 mr-1" />}
                    {isPremium ? 'Premium' : 'Free'}
                  </span>
                </div>

                {isPremium ? (
                  <div className="space-y-4">
                    <div className="bg-surface rounded-lg border border-charcoal/50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Premium Plan</h3>
                          <p className="text-sm text-vanilla/70 flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Next billing: January 15, 2025
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">$9.00</p>
                          <p className="text-sm text-vanilla/70">per month</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button className="flex items-center justify-center px-4 py-2 bg-surface-alt hover:bg-surface rounded-md border border-charcoal/50 text-vanilla/80 transition-colors">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Update Payment
                      </button>
                      <button 
                        onClick={handleDowngradePlan}
                        className="flex items-center justify-center px-4 py-2 bg-surface hover:bg-surface-alt text-vanilla/80 rounded-md border border-charcoal/50 transition-colors"
                      >
                        Cancel Plan
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-surface rounded-lg border border-charcoal/50 p-4 space-y-3">
                      <h3 className="font-medium">Free Plan</h3>
                      <p className="text-sm text-vanilla/70">You have access to basic features with limited generations.</p>
                      <div className="flex justify-between text-sm text-vanilla/70">
                        <span>Carousels used</span>
                        <span>{user.carouselsGenerated}/{user.maxCarousels}</span>
                      </div>
                      <div className="w-full bg-surface-alt rounded-full h-2">
                        <div 
                          className="bg-pacific h-2 rounded-full"
                          style={{ width: `${(user.carouselsGenerated / user.maxCarousels) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleUpgradeToPremium}
                      className="w-full sf-btn-primary justify-center"
                    >
                      Upgrade to Premium
                    </button>
                  </div>
                )}
              </div>

              {/* Billing History */}
              <div className="sf-card p-6">
                <h2 className="text-xl font-semibold mb-4">Billing History</h2>
                {isPremium ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-charcoal/50 rounded-md bg-surface">
                      <div className="flex items-center">
                        <div className="p-2 bg-pacific/15 rounded-md mr-3">
                          <Check className="h-5 w-5 text-pacific" />
                        </div>
                        <div>
                          <p className="font-medium">Premium Plan</p>
                          <p className="text-sm text-vanilla/70">December 15, 2024</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">$9.00</p>
                        <button className="text-sm text-pacific hover:text-vanilla">
                          <Download className="inline h-3 w-3 mr-1" />
                          Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-vanilla/40 mx-auto mb-4" />
                    <p className="text-vanilla/70">No billing history available</p>
                    <p className="text-sm text-vanilla/60">Upgrade to Premium to see your billing history</p>
                  </div>
                )}
              </div>
            </div>

            {/* Plan Comparison */}
            <div className="space-y-6">
              <div className="sf-card p-6 space-y-4">
                <h3 className="text-lg font-semibold">Plan Features</h3>
                
                <div className={`border-2 rounded-lg p-4 transition-colors ${
                  selectedPlan === 'free' ? 'border-pacific/60 bg-surface' : 'border-charcoal/50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Free</h4>
                    <span className="text-xl font-bold">$0</span>
                  </div>
                  <ul className="space-y-2 text-sm text-vanilla/80">
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-pacific mr-2" />
                      1 carousel generation
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-pacific mr-2" />
                      All design templates
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-pacific mr-2" />
                      1080 exports
                    </li>
                  </ul>
                </div>

                <div className={`border-2 rounded-lg p-4 transition-colors ${
                  isPremium ? 'border-pacific bg-surface' : 'border-charcoal/50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium flex items-center">
                      <Crown className="h-4 w-4 text-pacific mr-1" />
                      Premium
                    </h4>
                    <div className="text-right">
                      <span className="text-xl font-bold">$9</span>
                      <p className="text-xs text-vanilla/60">per month</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-vanilla/80">
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-pacific mr-2" />
                      Unlimited generations
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-pacific mr-2" />
                      Caption generator
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-pacific mr-2" />
                      Team collaboration
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-pacific mr-2" />
                      Priority support
                    </li>
                  </ul>
                  {!isPremium && (
                    <button 
                      onClick={handleUpgradeToPremium}
                      className="mt-4 sf-btn-primary w-full justify-center"
                    >
                      Upgrade to Premium
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
