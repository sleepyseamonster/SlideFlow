import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { 
  SwatchBook, 
  Palette, 
  Type, 
  Sparkles, 
  Info, 
  Check,
  ArrowLeft
} from 'lucide-react';

const styleOptions = [
  {
    value: 'minimalist',
    title: 'Minimalist',
    description: 'Clean, airy layouts for educational and how-to carousels.',
  },
  {
    value: 'bold',
    title: 'Bold',
    description: 'High-contrast colors and type for launches or promos.',
  },
  {
    value: 'elegant',
    title: 'Elegant',
    description: 'Refined, editorial feel for case studies or thought leadership.',
  },
] as const;

const fontOptions = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Source Sans Pro',
  'Nunito',
  'Ubuntu',
];

const defaultPalette = {
  primary: '#3BB0B2',
  secondary: '#454440',
  accent1: '#EDE0C9',
  accent2: '#31666A',
};

export default function BrandProfile() {
  const [selectedStyle, setSelectedStyle] = useState<(typeof styleOptions)[number]['value']>('minimalist');
  const [palette, setPalette] = useState(defaultPalette);
  const [fonts, setFonts] = useState({
    primary: fontOptions[0],
    secondary: fontOptions[1],
  });

  const formatLabel = (key: string) => {
    if (key.startsWith('accent')) {
      return `Accent ${key.slice(-1)}`;
    }
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <Navbar />

      <main className="pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="space-y-3">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center text-pacific hover:text-vanilla font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-vanilla">Keep every carousel on-brand</h1>
            <p className="text-vanilla/70 max-w-3xl">
              Save your go-to style, colors, and fonts once. SlideFlow will reuse them across new carousels and captions.
            </p>
            <div className="inline-flex items-center gap-2 text-sm text-vanilla/70 bg-surface rounded-lg border border-charcoal/50 px-4 py-2">
              <Sparkles className="h-4 w-4 text-pacific" />
              <span>Preset saving is next up—these controls are ready for wiring to Supabase.</span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="sf-card p-6 space-y-4 lg:col-span-2">
              <div className="flex items-center gap-3">
                <SwatchBook className="h-5 w-5 text-pacific" />
                <div>
                  <h2 className="text-xl font-semibold text-vanilla">Style</h2>
                  <p className="text-vanilla/70">Pick the base vibe applied to SlideBoard and Generate Caption.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {styleOptions.map(({ value, title, description }) => {
                  const active = selectedStyle === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedStyle(value)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        active
                          ? 'border-pacific bg-pacific/10 shadow-soft'
                          : 'border-charcoal/50 hover:border-charcoal/70 bg-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-vanilla">{title}</h3>
                        {active && <Check className="h-4 w-4 text-pacific" />}
                      </div>
                      <p className="text-sm text-vanilla/70 mt-1.5">{description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sf-card p-6 space-y-3">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-pacific mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-vanilla">Preset save/apply coming soon</p>
                  <p className="text-sm text-vanilla/70">
                    This page centralizes brand defaults per the plan doc. Supabase + context wiring will land in the next task.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="sf-btn-secondary w-full justify-center opacity-70 cursor-not-allowed"
                disabled
              >
                Save preset
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="sf-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Palette className="h-5 w-5 text-pacific" />
                <div>
                  <h2 className="text-xl font-semibold text-vanilla">Color palette</h2>
                  <p className="text-vanilla/70">Primary, secondary, and accent colors that stay consistent.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {Object.entries(palette).map(([key, value]) => (
                  <div key={key} className="p-4 rounded-xl border border-charcoal/50 bg-surface space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-vanilla">{formatLabel(key)}</span>
                      <span className="text-vanilla/70">{value}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-lg border border-charcoal/50 shadow-inner"
                        style={{ backgroundColor: value }}
                      />
                      <input
                        type="color"
                        aria-label={`${formatLabel(key)} color`}
                        value={value}
                        onChange={(e) =>
                          setPalette((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        className="h-10 w-full bg-surface-alt rounded-lg border border-charcoal/60 cursor-pointer"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-vanilla/60">
                Palette controls mirror the plan doc. Persisting values to Supabase will be wired when the store is ready.
              </p>
            </div>

            <div className="sf-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Type className="h-5 w-5 text-pacific" />
                <div>
                  <h2 className="text-xl font-semibold text-vanilla">Typography</h2>
                  <p className="text-vanilla/70">Choose your go-to type pair for headers and body text.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-vanilla/80 block">Primary font</label>
                  <select
                    value={fonts.primary}
                    onChange={(e) => setFonts((prev) => ({ ...prev, primary: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-charcoal/60 bg-surface focus:border-pacific focus:ring-2 focus:ring-pacific/60"
                  >
                    {fontOptions.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-vanilla/80 block">Secondary font</label>
                  <select
                    value={fonts.secondary}
                    onChange={(e) => setFonts((prev) => ({ ...prev, secondary: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-charcoal/60 bg-surface focus:border-pacific focus:ring-2 focus:ring-pacific/60"
                  >
                    {fontOptions.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="p-4 rounded-xl border border-charcoal/50 bg-surface-alt space-y-1.5">
                  <p className="text-xs uppercase text-vanilla/60 tracking-[0.2em]">Preview</p>
                  <p className="text-lg font-semibold" style={{ fontFamily: fonts.primary }}>
                    Headline in {fonts.primary}
                  </p>
                  <p className="text-sm text-vanilla/80" style={{ fontFamily: fonts.secondary }}>
                    Body text in {fonts.secondary}. Selections stay local until persistence is implemented.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="sf-card p-6 space-y-3">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-pacific" />
              <div>
                <h2 className="text-xl font-semibold text-vanilla">Presets</h2>
                <p className="text-vanilla/70">
                  Create, apply, and manage presets here once the storage layer is wired up.
                </p>
              </div>
            </div>
            <div className="bg-surface rounded-lg border border-charcoal/50 p-4 text-sm text-vanilla/75">
              <p>
                Preset lists, apply, and delete controls will live here. Hook this section to Supabase and the brand
                profile store when you tackle the remaining Brand Profile tasks.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
