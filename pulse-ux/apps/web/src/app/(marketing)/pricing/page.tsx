"use client";

import Link from "next/link";
import { Check, ArrowRight, Zap, Shield, Rocket } from "lucide-react";
import { WavyAsciiBackground } from "@/components/wavy-ascii-background";
import { cn } from "@/lib/utils";

export default function PricingPage() {
    return (
        <div className="relative min-h-screen pt-24 pb-20 overflow-hidden">
            <WavyAsciiBackground />

            <div className="relative z-10 container mx-auto px-6">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 font-sans">
                        Simple, transparent pricing
                    </h1>
                    <p className="text-xl text-white/70">
                        Start optimizing your UX today. Scale as you grow.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
                    {/* Free */}
                    <PricingCard
                        title="Free"
                        price="$0"
                        description="For hobbyists and people who just like watching wavy text."
                        icon={<Zap className="w-6 h-6 text-lime-400" />}
                        features={[
                            "1 Project",
                            "500 Monthly Visitors",
                            "Basic AI Analysis",
                            "Community Support",
                            "Unconditional love from our bots"
                        ]}
                        cta="Start for Free"
                        href="/register"
                    />

                    {/* Developer */}
                    <PricingCard
                        title="Developer"
                        price="$49"
                        period="/month"
                        description="For shipping features and fixing UX debt."
                        icon={<Rocket className="w-6 h-6 text-purple-400" />}
                        highlighted
                        features={[
                            "Unlimited Projects",
                            "50,000 Monthly Visitors",
                            "Opus AI Models",
                            "A/B Testing Engine",
                            "Priority Email Support",
                            "Coffee not included"
                        ]}
                        cta="Get Developer"
                        href="/register?plan=dev"
                    />

                    {/* Enterprise */}
                    <PricingCard
                        title="Enterprise"
                        price="Custom"
                        description="For when you need explicit SLAs and someone to blame."
                        icon={<Shield className="w-6 h-6 text-blue-400" />}
                        features={[
                            "Unlimited Everything",
                            "Dedicated Success Manager",
                            "SSO & Security Compliance",
                            "On-premise Deployment",
                            "Access to our secret slack channel"
                        ]}
                        cta="Contact Sales"
                        href="mailto:sales@pulse.dev"
                    />
                </div>

                {/* God Mode - Humor Tier */}
                <div className="max-w-6xl mx-auto">
                    <PricingCard
                        title="God Mode"
                        price="$2B"
                        period="/one-time"
                        description="Acquire the company, the IP, and the souls of the founders."
                        icon={<span className="text-4xl">🪐</span>}
                        features={[
                            "We rename the company to your name",
                            "You become the CEO instantly",
                            "Source code printed on gold sheets",
                            "A personal apology from the previous CEO"
                        ]}
                        cta="Buy Pulse"
                        href="https://stripe.com"
                        highlighted={true}
                    />
                </div>

                {/* FAQ Preview or Trust could go here */}
            </div>
        </div>
    );
}

function PricingCard({
    title,
    price,
    period,
    description,
    features,
    cta,
    href,
    highlighted = false,
    icon
}: {
    title: string;
    price: string;
    period?: string;
    description: string;
    features: string[];
    cta: string;
    href: string;
    highlighted?: boolean;
    icon?: React.ReactNode;
}) {
    return (
        <div
            className={cn(
                "relative p-8 rounded-2xl border backdrop-blur-md transition-all duration-300 group hover:-translate-y-2",
                highlighted
                    ? "bg-white/5 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)]"
                    : "bg-black/20 border-white/10 hover:bg-black/40 hover:border-white/20"
            )}
        >
            {highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-lime-400 to-purple-500 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                </div>
            )}

            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className={cn("p-2 rounded-lg bg-white/5", highlighted ? "text-purple-400" : "text-lime-400")}>
                        {icon}
                    </div>
                    <h3 className="text-xl font-bold">{title}</h3>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold text-white">{price}</span>
                    {period && <span className="text-white/50">{period}</span>}
                </div>
                <p className="text-white/60 text-sm leading-relaxed">{description}</p>
            </div>

            <ul className="space-y-4 mb-8">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-white/80">
                        <Check className="w-5 h-5 text-lime-400 shrink-0" />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>

            <Link
                href={href}
                className={cn(
                    "w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200",
                    highlighted
                        ? "bg-gradient-to-r from-lime-400 to-purple-500 text-black hover:opacity-90"
                        : "bg-white/10 hover:bg-white/20 text-white"
                )}
            >
                {cta} <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    );
}
