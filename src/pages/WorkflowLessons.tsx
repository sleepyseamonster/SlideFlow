import React from 'react';
import { Link } from 'react-router-dom';

export default function WorkflowLessons() {
  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <main className="pt-24 pb-12">
        <div className="sf-wide-shell">
          <div className="rounded-[20px] border border-charcoal/60 bg-surface-alt/90 p-10 shadow-soft space-y-6 max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-vanilla">Workflow Lessons</h1>
            <p className="text-lg text-vanilla/80 leading-relaxed">
              SlideFlow Studio tutorials covering crop tools, overlays, AI helpers, and export workflows are on the way.
              We&apos;re crafting lesson-style guides so you can master the Studio faster.
            </p>
            <p className="text-base text-vanilla/60">
              Coming soon — stay tuned for the lessons that make your publish routine effortless.
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
