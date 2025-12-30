import React from 'react';
import { Link } from 'react-router-dom';

export default function OnboardingCourses() {
  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <main className="pt-24 pb-12">
        <div className="sf-wide-shell">
          <div className="rounded-[20px] border border-charcoal/60 bg-surface-alt/90 p-10 shadow-soft space-y-6 max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-vanilla">Onboarding Courses</h1>
            <p className="text-lg text-vanilla/80 leading-relaxed">
              Guided walkthroughs that take you through SlideFlow from your first upload to a published carousel are coming soon. 
              We&apos;re polishing each step so the onboarding path feels smooth and supercharged.
            </p>
            <p className="text-base text-vanilla/60">
              Coming soon — check back once the course library is live to learn the quickest path from idea to carousel.
            </p>
            <div>
              <Link
                to="/dashboard"
                className="sf-btn-secondary inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
