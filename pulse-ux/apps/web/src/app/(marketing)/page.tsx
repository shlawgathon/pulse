/**
 * Landing Page - Detail.dev-inspired design
 *
 * Features:
 * - Bold hero with angular decorative elements
 * - Lime-400 green accent color
 * - Pure black background
 * - Monospace CTAs
 */
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Zap, LineChart, GitPullRequest, Eye } from "lucide-react";
import { WavyAsciiBackground } from "@/components/wavy-ascii-background";

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen overflow-hidden pt-16">
        {/* Angular decorative element */}
        <WavyAsciiBackground />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 pt-32 pb-20 flex flex-col items-center text-center">
          <div className="max-w-4xl">
            {/* Bold headline */}
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
              Your UX is full of
              <br />
              missed conversions.
            </h1>

            {/* Subheadline */}
            <h2 className="text-2xl md:text-3xl font-semibold text-white/90 mb-6">Let us show you.</h2>

            {/* Description */}
            <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">
              Pulse scans your site to find UX improvements. Each experiment spends hours testing variants with real
              users to uncover optimizations you&apos;ll be glad to ship.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="cta-button inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-md hover:bg-primary/90 transition-colors"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="mailto:engineering@pulse.dev"
                className="inline-flex items-center gap-2 border border-white/20 px-8 py-3 rounded-md hover:bg-white/10 transition-colors"
              >
                Talk to an engineer <ArrowRight className="w-4 h-4" />
              </Link>
            </div>


          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative z-10">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Optimizing UX, <br />
              <span className="text-lime-400">One pixel at a time.</span>
            </h2>
            <p className="text-white/60 text-xl max-w-2xl mx-auto">
              Most tools tell you <i>what</i> is wrong. Pulse fixes it.
              We generate code, run experiments, and maximize conversions automatically.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Eye className="w-8 h-8 text-lime-400" />}
              title="Deep DOM Analysis"
              description="Our agent reads your website structure like a browser. It understands layout, contrast, and interactivity better than a human auditor."
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8 text-purple-400" />}
              title="Generative UI"
              description="We don't just give suggestions. Pulse generates React code to fix the issues, creating drop-in replacements for your components."
            />
            <FeatureCard
              icon={<LineChart className="w-8 h-8 text-blue-400" />}
              title="Auto-Pilot Testing"
              description="Variants are deployed instantly. Traffic is split, data is collected, and the winner is promoted automatically."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-32 relative z-10">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-20">
            From 0 to Optimized in <span className="text-purple-400">Minutes</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-lime-400 via-purple-400 to-blue-400 opacity-20" />

            <Step
              number="01"
              title="Install the Snippet"
              description="Add a single line of JS to your head tag. It's lightweight, async, and won't slow down your site."
            />
            <Step
              number="02"
              title="AI Scans & Generates"
              description="Pulse analyzes user sessions and heatmaps. It identifies drop-offs and generates variants to fix them."
            />
            <Step
              number="03"
              title="Watch Conversions Rise"
              description="We route traffic to the best variants. You see a dashboard of winning experiments and ROI."
            />
          </div>

          <div className="mt-24 text-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-3 bg-white text-black px-10 py-4 rounded-full font-bold text-lg hover:bg-white/90 transition-transform hover:scale-105"
            >
              Start Optimizing Now <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 relative z-50 bg-black mt-auto">
        <div className="container mx-auto px-6 text-center text-white/40">
          <p>&copy; {new Date().getFullYear()} Pulse UX. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
      <div className="mb-6 p-3 bg-white/5 rounded-xl w-fit">{icon}</div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-white/60 leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="relative p-8 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 text-center md:text-left hover:border-lime-400/30 transition-colors">
      <span className="text-6xl font-bold text-white/5 absolute top-4 right-4 -z-10">{number}</span>
      <div className="w-12 h-1 bg-lime-400 mb-6 mx-auto md:mx-0 relative z-20 shadow-[0_0_10px_rgba(163,230,53,0.3)]" />
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className="text-white/60 leading-relaxed">{description}</p>
    </div>
  );
}


