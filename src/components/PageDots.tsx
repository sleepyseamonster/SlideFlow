import React from 'react';

type PageDotsProps = {
  total: number;
  active: number; // 1-based index of the active page
  className?: string;
};

export default function PageDots({ total, active, className }: PageDotsProps) {
  const safeTotal = Math.max(0, total);
  const safeActive = Math.min(Math.max(1, active), Math.max(1, safeTotal));

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center ${className ?? ''}`}
      aria-hidden
    >
      <div className="flex items-center gap-3 rounded-full border border-charcoal/40 bg-ink/80 px-4 py-2 backdrop-blur-sm shadow-soft">
        {Array.from({ length: safeTotal }, (_, idx) => {
          const isActive = idx + 1 === safeActive;
          return (
            <span
              key={idx}
              className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${
                isActive
                  ? 'bg-tropical shadow-[0_0_0_6px_rgba(64,160,178,0.18)]'
                  : 'bg-charcoal/50'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
