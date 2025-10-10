import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createCheckoutSession } from '../lib/stripe';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import CircularGalleryDemo from '../components/CircularGalleryDemo';
import { SparklesText } from '../components/ui/sparkles-text';
import { 
  ArrowRight, 
  ImagePlus,
  Sparkles,
  Download,
  Check,
  Star,
  Users,
  Zap,
  Instagram
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleStartPremium = async () => {
    if (!user) {
      navigate('/signup');
      return;
    }

    setLoading(true);
    try {
      const { url, error } = await createCheckoutSession(user.id);
      if (error) {
        console.error('Checkout error:', error);
        alert(`Failed to start checkout: ${error}`);
        return;
      }
      if (url) {
        window.location.href = url;
      } else {
        alert('No checkout URL received. Please try again.');
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      alert(`Failed to start checkout: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  const features = [
    {
      icon: <ImagePlus className="h-6 w-6" />,
      title: 'Upload Photos',
      description: 'Simply upload your images and add a short description of your message.'
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: 'AI Generation',
      description: 'Our AI creates professional captions, layouts, and cohesive design automatically.'
    },
    {
      icon: <Download className="h-6 w-6" />,
      title: 'Download',
      description: 'Download your carousel as optimized 1080x1080px images ready for Instagram.'
    }
  ];

  const examples = [
    {
      title: 'Marketing Tips',
      style: 'Minimalist',
      image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2'
    },
    {
      title: 'Product Launch',
      style: 'Bold',
      image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2'
    },
    {
      title: 'Brand Story',
      style: 'Elegant',
      image: 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2'
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-800 pt-20">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Create Instagram
            <Instagram className="inline-block ml-4 h-12 w-12 md:h-16 md:w-16 text-white" />
            <br />
            <span className="relative bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></span>
              Carousels in Minutes
            </span>
          </h1>
          <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto">
            Upload photos, add a description, and let our AI generate professional carousel posts 
            with captions, layouts, and cohesive design — perfect for agencies and entrepreneurs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/signup"
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-teal-500/50 hover:shadow-2xl flex items-center justify-center relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl"></div>
              <div className="relative z-10 flex items-center">
              Try Free Now
              <ArrowRight className="ml-2 h-5 w-5" />
              </div>
            </Link>
            <button 
              onClick={() => document.getElementById('examples')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-2 border-white text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white hover:text-indigo-900 transition-all duration-300"
            >
              View Examples
            </button>
          </div>
          <p className="text-gray-300 mt-4">No credit card required • 1 free carousel</p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <SparklesText 
              text="How It Works" 
              className="text-4xl font-bold text-gray-900 mb-4"
              colors={{ first: '#14b8a6', second: '#0891b2' }}
              sparklesCount={8}
            />
            <p className="text-xl text-gray-600">Three simple steps to professional carousels</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="bg-indigo-100 text-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Examples */}
      <section id="examples" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <SparklesText 
              text="Example Carousels" 
              className="text-4xl font-bold text-gray-900 mb-4"
              colors={{ first: '#14b8a6', second: '#0891b2' }}
              sparklesCount={8}
            />
            <p className="text-xl text-gray-600 mb-8">See what SlideFlow can create for you</p>
            <p className="text-gray-600">Scroll to explore different carousel styles</p>
          </div>
          <CircularGalleryDemo />
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <SparklesText 
              text="Simple Pricing" 
              className="text-4xl font-bold text-gray-900 mb-4"
              colors={{ first: '#14b8a6', second: '#0891b2' }}
              sparklesCount={8}
            />
            <p className="text-xl text-gray-600">Start free, upgrade when you need more</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-indigo-300 transition-colors">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Free Trial</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-600">/first carousel</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-teal-500 mr-3" />
                  <span>1 carousel generation</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-teal-500 mr-3" />
                  <span>All design templates</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-teal-500 mr-3" />
                  <span>1080x1080px export</span>
                </li>
              </ul>
              <Link 
                to="/signup"
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 px-6 rounded-xl font-semibold text-center block transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="bg-teal-400 text-indigo-900 px-3 py-1 rounded-full text-sm font-semibold">
                  Popular
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Premium</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">$9</span>
                <span className="text-indigo-200">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-teal-400 mr-3" />
                  <span>Unlimited generations</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-teal-400 mr-3" />
                  <span>Instagram caption generator</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-teal-400 mr-3" />
                  <span>Team sharing & collaboration</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-teal-400 mr-3" />
                  <span>Priority support</span>
                </li>
              </ul>
              <button
                onClick={handleStartPremium}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-100 text-indigo-600 py-3 px-6 rounded-xl font-semibold text-center block transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Start Premium'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <img 
                src="https://storage.googleapis.com/msgsndr/QFjnAi2H2A9Cpxi7l0ri/media/68bdde997b3d2f00448d506d.png" 
                alt="SlideFlow" 
                className="h-8 w-auto"
              />
            </div>
            <p className="text-gray-400">
              © 2025 SlideFlow. All rights reserved. Made for creators, by creators.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}