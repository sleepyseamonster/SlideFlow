import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PageDots from '../components/PageDots';
import { Sparkles } from 'lucide-react';
import { type Carousel } from '../contexts/CarouselContext';

const TOTAL_APP_PAGES = 5;

export default function SlideFlowStudio() {
  const location = useLocation();
  const navState = location.state as { carousel?: Carousel; caption?: string } | null;
  const navCarousel = navState?.carousel;
  const navCaption = navState?.caption;

  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <Navbar />
      <main className="pt-24 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="sf-card px-6 py-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pacific/20 text-pacific">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold">SlideFlow Studio</h1>
                <p className="text-sm text-vanilla/70">
                  Studio is coming soon. We&apos;ll bring your slides, caption, and settings into the new workspace when it ships.
                </p>
              </div>
            </div>
            {navCarousel && (
              <div className="rounded-lg border border-charcoal/60 bg-surface-alt p-4 space-y-2">
                <p className="text-sm font-semibold text-vanilla">What we&apos;ll carry over</p>
                <ul className="list-disc list-inside text-sm text-vanilla/70 space-y-1">
                  <li>{navCarousel.slides.length} slide(s) from {navCarousel.title || 'your carousel'}.</li>
                  <li>{navCaption ? 'Your caption draft is saved here.' : 'Caption draft will load from Publish.'}</li>
                </ul>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Link
                to={navCarousel ? `/publish/${navCarousel.id}` : '/dashboard'}
                state={navCarousel ? { carousel: navCarousel, caption: navCaption } : undefined}
                className="sf-btn-primary"
              >
                Back to Publish
              </Link>
              <Link to="/dashboard" className="sf-btn-secondary">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
      <PageDots total={TOTAL_APP_PAGES} active={4} />
    </div>
  );
}
