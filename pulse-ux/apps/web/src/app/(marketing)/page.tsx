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
import { ArrowRight, Zap, LineChart, GitPullRequest, Eye } from "lucide-react";

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen overflow-hidden pt-16">
        {/* Angular decorative element */}
        <div
          className="absolute right-0 top-0 w-1/3 h-full bg-white diagonal-slice hidden lg:block"
          aria-hidden="true"
        />

        {/* Red accent line (like Detail.dev) */}
        <div className="absolute right-[33%] top-0 w-1 h-full bg-red-500 hidden lg:block" aria-hidden="true" />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 pt-32 pb-20">
          <div className="max-w-2xl">
            {/* Bold headline */}
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
              Your UX is full of
              <br />
              missed conversions.
            </h1>

            {/* Subheadline */}
            <h2 className="text-2xl md:text-3xl font-semibold text-white/90 mb-6">Let us show you.</h2>

            {/* Description */}
            <p className="text-lg text-white/70 mb-10 max-w-xl">
              Pulse scans your site to find UX improvements. Each experiment spends hours testing variants with real
              users to uncover optimizations you&apos;ll be glad to ship.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/register"
                className="cta-button inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-md hover:bg-primary/90 transition-colors"
              >
                TRY FOR FREE
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/demo"
                className="cta-button inline-flex items-center gap-2 border border-white text-white px-8 py-3 rounded-md hover:bg-white/10 transition-colors"
              >
                TALK TO AN ENGINEER
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-black">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">How Pulse Works</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-lg border border-white/10 hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Scan Your Site</h3>
              <p className="text-white/60 text-sm">
                We analyze your DOM structure to understand your current UX and identify improvement opportunities.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-lg border border-white/10 hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Generate Variants</h3>
              <p className="text-white/60 text-sm">
                Claude Opus 4.5 generates UX improvements tailored to your specific conversion goals.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-lg border border-white/10 hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <LineChart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Run Experiments</h3>
              <p className="text-white/60 text-sm">
                A/B test variants with real users. Our script applies changes at runtime—no deploys needed.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-lg border border-white/10 hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <GitPullRequest className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Ship the Winner</h3>
              <p className="text-white/60 text-sm">
                When you pick a winner, we generate a PR with the code changes ready for review.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 border-y border-white/10">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-5xl font-bold text-primary mb-2">&lt;5m</div>
              <div className="text-white/60">Time to first experiment</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-primary mb-2">95%</div>
              <div className="text-white/60">Patch success rate</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-primary mb-2">80%</div>
              <div className="text-white/60">PR acceptance rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to optimize your UX?</h2>
          <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">
            Start finding conversion opportunities today. No credit card required.
          </p>
          <Link
            href="/register"
            className="cta-button inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-md hover:bg-primary/90 transition-colors text-lg"
          >
            GET STARTED FOR FREE
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
