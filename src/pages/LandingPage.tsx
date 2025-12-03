import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createCheckoutSession } from '../lib/stripe';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import CircularGalleryDemo from '../components/CircularGalleryDemo';
import { SparklesText } from '../components/ui/sparkles-text';
import {
  ImagePlus,
  Sparkles,
  Download,
  Zap,
  Instagram,
  CalendarClock,
  Palette
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Unexpected error:', err);
      alert(`Failed to start checkout: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const heroSteps = [
    {
      title: 'Upload images',
      description: 'Drop your visuals directly into SlideFlow. No editing required.',
      icon: <ImagePlus className="h-5 w-5" />,
    },
    {
      title: 'Arrange slides',
      description: 'Storyboard the carousel with simple drag-and-drop.',
      icon: <Zap className="h-5 w-5" />,
    },
    {
      title: 'Apply brand & captions',
      description: 'Saved colors, fonts, and AI captions keep every slide on-brand.',
      icon: <Palette className="h-5 w-5" />,
    },
    {
      title: 'Post or schedule',
      description: 'Publish to Instagram instantly or pick a time on your calendar.',
      icon: <CalendarClock className="h-5 w-5" />,
    },
  ];

  const howItWorks = [
    {
      title: 'Upload images',
      description: 'Drop images directly into SlideFlow. No editing or graphics work.',
      icon: <ImagePlus className="h-5 w-5" />,
    },
    {
      title: 'Organize the story',
      description: 'Drag slides into the right order—the storyboard is your design file.',
      icon: <Zap className="h-5 w-5" />,
    },
    {
      title: 'Apply brand elements',
      description: 'Colors and fonts from your saved brand profile apply across text.',
      icon: <Palette className="h-5 w-5" />,
    },
    {
      title: 'Write or generate captions',
      description: 'Type your caption or let AI write context-aware copy and hashtags.',
      icon: <Sparkles className="h-5 w-5" />,
    },
    {
      title: 'Post or schedule',
      description: 'Publish instantly or pick a future time in your posting calendar.',
      icon: <CalendarClock className="h-5 w-5" />,
    },
    {
      title: 'Export anytime',
      description: 'Download updated slides whenever you want to repurpose them.',
      icon: <Download className="h-5 w-5" />,
    },
  ];

  const objections = [
    {
      q: 'Is SlideFlow a design tool or image editor?',
      a: 'Neither. We do simple automatic background removal or image composites to assemble, then use AI to caption and publish your carousel.'
    },
    {
      q: 'Do I need design skills to use this?',
      a: 'Nope. Arrange your slides. Optionally, choose your brand, colors, and fonts. Provide a caption or short prompt and SlideFlow handles the rest.'
    },
    {
      q: 'Can I post or schedule directly to Instagram?',
      a: 'Yes. Approve your flow, then publish instantly or schedule it. You’ll need your connected Instagram account—don’t worry, we show you how.'
    },
  ];

  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 md:pt-40 pb-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-10 top-0 h-72 w-72 bg-pacific/25 blur-[120px]"></div>
          <div className="absolute right-0 top-10 h-80 w-80 bg-slate/25 blur-[120px]"></div>
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
            <div className="space-y-7 relative">
              <div className="flex items-start gap-4">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold leading-tight space-y-2 max-w-4xl">
                    <span className="block">Create Instagram Carousels in Minutes</span>
                  </h1>
                </div>
              </div>
              <div className="absolute top-0 right-0 h-16 w-16 rounded-xl bg-surface-alt/80 border border-charcoal/50 flex items-center justify-center text-pacific">
                <Instagram className="h-10 w-10" />
              </div>
              <div className="space-y-3 text-lg text-vanilla/80 max-w-3xl">
                <p className="text-2xl md:text-3xl font-semibold text-pacific">
                  Upload. Arrange. Generate. Publish.
                </p>
                <p className="text-lg md:text-xl text-vanilla/90 leading-8">
                  No design software. No editing. Just a clean workflow for turning ideas into ready-to-post carousels.
                </p>
                <p className="text-sm md:text-base" style={{ color: '#a6a294' }}>
                  Built for creators, solopreneurs, small businesses, coaches, and marketers who want to publish faster.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/signup" className="sf-btn-primary text-base px-6 py-3">
                  Start Free
                </Link>
                <button
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="sf-btn-secondary text-base px-6 py-3"
                >
                  See how SlideFlow works
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-8 -top-6 h-20 w-20 bg-pacific/25 blur-3xl"></div>
              <div className="absolute -right-6 -bottom-8 h-24 w-24 bg-slate/25 blur-3xl"></div>
              <div className="sf-panel w-full max-w-sm p-4 space-y-2.5 mx-auto border border-charcoal/40 relative overflow-hidden">
                <img
                  src="/retro-slide.png"
                  alt="Retro accent"
                  className="absolute top-0 left-0 h-4 w-auto max-w-none object-contain pointer-events-none select-none"
                />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-base">Carousel assembly without design tools</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {heroSteps.map((step, idx) => (
                    <div
                      key={step.title}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-surface border border-charcoal/45"
                    >
                      <div className="flex-none h-[2.625rem] w-[2.625rem] min-h-[2.625rem] min-w-[2.625rem] rounded-full bg-[#225561] text-vanilla font-black flex items-center justify-center text-xl leading-none">
                        {idx + 1}
                      </div>
                      <div className="flex items-center gap-3 w-full">
                        <div className="h-9 w-9 aspect-square rounded-md bg-surface-alt/90 border border-charcoal/50 text-pacific flex items-center justify-center">
                          {step.icon}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs md:text-sm font-semibold text-vanilla/60">{step.title}</p>
                          <p className="text-[11px] md:text-xs text-vanilla/50">{step.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="sf-card p-8 flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <p className="text-vanilla text-2xl font-bold leading-8">
                  SlideFlow gives creators a frictionless way to assemble, caption, schedule, and post Instagram carousels
                </p>
                <p className="text-vanilla/90 text-lg leading-7">
                  —without ever touching graphic design or image editing. It's fast, easy, and powered by AI, making it the go‑to tool for anyone who wants to grow their brand on Instagram with clean, consistent carousel content.
                </p>
              </div>
              <Link to="/signup" className="sf-btn-primary w-fit">
                Start Free
              </Link>
            </div>
            <div className="flex-1 bg-surface rounded-lg border border-charcoal/40 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-vanilla/60">Clarity</p>
                  <p className="text-lg font-semibold">What SlideFlow solves</p>
                </div>
                <Sparkles className="h-6 w-6 text-pacific" />
              </div>
              <div className="space-y-3 text-sm text-vanilla/80">
                <p>Posting carousels by hand is slow. SlideFlow posts directly to Instagram.</p>
                <p>Graphic design overload disappears because SlideFlow assembles slides without editing images.</p>
                <p>Caption writing fatigue fades as AI writes context-aware captions tailored to your idea.</p>
                <p>Consistency becomes automatic with saved brand colors, fonts, scheduling, and exports.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <SparklesText 
              text="How SlideFlow works" 
              className="text-4xl font-bold mb-3"
              colors={{ first: '#40A0B2', second: '#325E6A' }}
              sparklesCount={8}
            />
            <p className="text-lg text-vanilla/70">SlideFlow is the fastest way to create, organize, and publish Instagram carousels. Upload, arrange, caption, and post—without graphic design or image editing.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {howItWorks.map((item) => (
              <div key={item.title} className="sf-card p-6 flex flex-col gap-3">
                <div className="h-10 w-10 rounded-md bg-pacific/20 text-pacific flex items-center justify-center">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-vanilla/70">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/signup" className="sf-btn-primary">Start Free</Link>
          </div>
        </div>
      </section>

      {/* Examples */}
      <section id="examples" className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <SparklesText 
              text="Example Carousels" 
              className="text-4xl font-bold mb-3"
              colors={{ first: '#40A0B2', second: '#325E6A' }}
              sparklesCount={8}
            />
            <p className="text-lg text-vanilla/70">All of these were generated with SlideFlow. Start your own in minutes.</p>
          </div>
          <CircularGalleryDemo />
        </div>
      </section>

      {/* Social proof / reassurance */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="sf-card p-8 space-y-3 text-center">
            <h3 className="text-2xl font-bold">Creators and content managers stay consistent without design tools.</h3>
            <p className="text-lg text-vanilla/80 max-w-3xl mx-auto">“We went from posting one carousel every other week to three per week without hiring a designer or opening Canva.”</p>
            <p className="text-sm text-vanilla/60">— Laura, Social media manager, boutique agency</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <SparklesText 
              text="Start free. Upgrade when carousels are routine." 
              className="text-4xl font-bold mb-3"
              colors={{ first: '#40A0B2', second: '#325E6A' }}
              sparklesCount={8}
            />
            <p className="text-lg text-vanilla/70">Generate your first carousel for free, then unlock unlimited runs, brand presets, direct posting, and scheduling with Premium.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="sf-card p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">Free trial</h3>
                <span className="sf-pill bg-surface text-vanilla/80">Starter</span>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-vanilla/70 ml-2">/ first carousel</span>
              </div>
              <ul className="space-y-3 mb-8 text-vanilla/80">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-pacific"></span>
                  1 full carousel generation with exports
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-pacific"></span>
                  AI captions and hashtags for your test post
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-pacific"></span>
                  Direct Instagram posting or scheduling for that carousel
                </li>
              </ul>
              <Link 
                to="/signup"
                className="sf-btn-secondary w-full justify-center"
              >
                Start free — generate your first carousel
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="bg-gradient-to-br from-pacific to-slate text-vanilla rounded-xl p-8 shadow-soft border border-charcoal/40 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="bg-ink/50 text-vanilla px-3 py-1 rounded-sm text-xs font-semibold border border-vanilla/20">
                  Popular
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-2">Premium</h3>
              <p className="text-vanilla/80 mb-4">For creators and teams who publish carousels regularly.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$9</span>
                <span className="text-vanilla/80 ml-2">/month</span>
              </div>
              <ul className="space-y-3 mb-8 text-vanilla/90">
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Unlimited carousel generations
                </li>
                <li className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Saved brand presets (colors and fonts)
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI-written captions and hashtags
                </li>
                <li className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Direct Instagram posting + scheduling
                </li>
                <li className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export updated slides anytime
                </li>
              </ul>
              <button 
                onClick={handleStartPremium}
                disabled={loading}
                className="sf-btn-secondary w-full justify-center bg-ink/20 hover:bg-ink/30 border-vanilla/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Upgrade to Premium'}
              </button>
              <p className="text-sm text-vanilla/70 mt-4 text-center">Cancel anytime from your profile. No long-term contracts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Objections / FAQ */}
      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-4">
            {objections.map((item) => (
              <div key={item.q} className="sf-card p-5 space-y-2">
                <p className="text-sm uppercase tracking-[0.08em] text-vanilla/60">FAQ</p>
                <h4 className="text-lg font-semibold">{item.q}</h4>
                <p className="text-vanilla/80 text-sm">{item.a}</p>
                <Link to="/signup" className="text-sm text-pacific hover:text-vanilla">Try it free in 2 minutes</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="sf-card p-8 text-center space-y-4">
            <h3 className="text-3xl font-bold">Start creating carousels the easy way.</h3>
            <p className="text-lg text-vanilla/70 max-w-3xl mx-auto">Upload your images, organize the slides, generate captions, and post directly to Instagram. No design software or image editing required.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/signup" className="sf-btn-primary px-6 py-3">
                Start Free
              </Link>
              <Link to="/login" className="sf-btn-secondary px-6 py-3">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface py-12 mt-6 border-t border-charcoal/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <img 
                src="/logo.png" 
                alt="SlideFlow" 
                className="h-8 w-auto"
              />
            </div>
            <div className="mt-2 flex justify-center space-x-4 text-vanilla/70">
              <Link to="/terms" className="hover:text-vanilla">Terms</Link>
              <Link to="/privacy" className="hover:text-vanilla">Privacy</Link>
              <a href="mailto:hello@slideflow.app" className="hover:text-vanilla">Support</a>
            </div>
            <p className="text-vanilla/60 mt-2">
              © 2025 SlideFlow. You handle visuals, we handle the flow.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
