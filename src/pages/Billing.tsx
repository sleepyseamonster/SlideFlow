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
  DollarSign,
  AlertCircle,
  Download
} from 'lucide-react';

export default function Billing() {
  const { user, updateUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(user?.plan || 'free');

  const handleUpgradeToPremium = () => {
    // Mock Stripe integration
    alert('Redirecting to Stripe checkout... (This is a demo)');
    updateUser({ plan: 'premium', maxCarousels: 999 });
  };

  const handleDowngradePlan = () => {
    if (confirm('Are you sure you want to downgrade to the free plan? You will lose access to premium features.')) {
      updateUser({ plan: 'free', maxCarousels: 1 });
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
            <Link 
              to="/profile" 
              className="inline-flex items-center text-indigo-600 hover:text-indigo-500 font-medium mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Plans</h1>
            <p className="text-gray-600">Manage your subscription and billing information</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Current Plan */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    user.plan === 'premium' 
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.plan === 'premium' && <Crown className="h-4 w-4 mr-1" />}
                    {user.plan === 'premium' ? 'Premium' : 'Free Plan'}
                  </span>
                </div>

                {user.plan === 'premium' ? (
                  <div className="space-y-4">
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">Premium Plan</h3>
                          <p className="text-sm text-gray-600">Next billing: January 15, 2025</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">$9.00</p>
                          <p className="text-sm text-gray-600">per month</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button className="flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Update Payment
                      </button>
                      <button 
                        onClick={handleDowngradePlan}
                        className="flex items-center justify-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                      >
                        Cancel Plan
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-2">Free Plan</h3>
                      <p className="text-sm text-gray-600">You have access to basic features with limited generations.</p>
                      <div className="mt-3">
                        <div className="flex justify-between text-sm">
                          <span>Carousels used</span>
                          <span>{user.carouselsGenerated}/{user.maxCarousels}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${(user.carouselsGenerated / user.maxCarousels) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleUpgradeToPremium}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
                    >
                      Upgrade to Premium
                    </button>
                  </div>
                )}
              </div>

              {/* Billing History */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Billing History</h2>
                {user.plan === 'premium' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg mr-3">
                          <Check className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Premium Plan</p>
                          <p className="text-sm text-gray-600">December 15, 2024</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">$9.00</p>
                        <button className="text-sm text-indigo-600 hover:text-indigo-500">
                          <Download className="inline h-3 w-3 mr-1" />
                          Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No billing history available</p>
                    <p className="text-sm text-gray-500">Upgrade to Premium to see your billing history</p>
                  </div>
                )}
              </div>
            </div>

            {/* Plan Comparison */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Features</h3>
                
                {/* Free Plan */}
                <div className={`border-2 rounded-xl p-4 mb-4 transition-colors ${
                  user.plan === 'free' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Free</h4>
                    <span className="text-xl font-bold">$0</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-teal-500 mr-2" />
                      1 carousel generation
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-teal-500 mr-2" />
                      All design templates
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-teal-500 mr-2" />
                      1080x1080px export
                    </li>
                  </ul>
                </div>

                {/* Premium Plan */}
                <div className={`border-2 rounded-xl p-4 transition-colors ${
                  user.plan === 'premium' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 flex items-center">
                      <Crown className="h-4 w-4 text-purple-600 mr-1" />
                      Premium
                    </h4>
                    <div className="text-right">
                      <span className="text-xl font-bold">$9</span>
                      <span className="text-sm text-gray-600">/mo</span>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-teal-500 mr-2" />
                      Unlimited generations
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-teal-500 mr-2" />
                      Instagram caption generator
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-teal-500 mr-2" />
                      Team collaboration
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-teal-500 mr-2" />
                      Priority support
                    </li>
                  </ul>
                  
                  {user.plan !== 'premium' && (
                    <button 
                      onClick={handleUpgradeToPremium}
                      className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all transform hover:scale-105"
                    >
                      Upgrade Now
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              {user.plan === 'premium' && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
                  <div className="flex items-center p-3 border border-gray-200 rounded-lg">
                    <CreditCard className="h-5 w-5 text-gray-400 mr-3" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">•••• •••• •••• 4242</p>
                      <p className="text-sm text-gray-600">Expires 12/26</p>
                    </div>
                    <button className="text-indigo-600 hover:text-indigo-500 text-sm">
                      Edit
                    </button>
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