"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Play, Sparkles } from "lucide-react";
import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";

export default function Hero() {
  return (
    <section className="relative px-6 lg:px-8 py-16 lg:py-24 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[128px]" />
      </div>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
        {/* Left Content */}
        <div className="space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-300">Introducing HoloHire</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-white leading-[1.1] tracking-tight">
            Video interview prep that feels like a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              real panel.
            </span>
          </h1>

          {/* Description */}
          <p className="text-gray-400 text-lg leading-relaxed max-w-xl">
            HoloHire mirrors the pace, tone, and follow-up depth of your target
            role. Get live coaching on delivery, eye contact, and filler words
            while your personal AI interviewer records every insight for you.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-3">
            {["Adaptive follow-up logic", "Body-language coaching", "ATS-ready transcripts"].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span className="text-sm font-medium text-gray-300">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <SignedOut>
              <SignUpButton mode="redirect">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-8 py-6 rounded-xl font-semibold text-base shadow-xl shadow-cyan-500/25 transition-all duration-300 hover:shadow-cyan-500/40 hover:scale-[1.02]"
                >
                  Start a mock interview
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-8 py-6 rounded-xl font-semibold text-base shadow-xl shadow-cyan-500/25 transition-all duration-300 hover:shadow-cyan-500/40 hover:scale-[1.02]"
                >
                  Start a mock interview
                </Button>
              </Link>
            </SignedIn>
            <Button
              variant="ghost"
              size="lg"
              className="text-gray-300 hover:text-white hover:bg-white/5 px-6 py-6 rounded-xl font-medium text-base group"
            >
              <Play className="w-4 h-4 mr-2 group-hover:text-cyan-400 transition-colors" />
              Watch product demo
            </Button>
          </div>

          {/* Subtext */}
          <p className="text-sm text-gray-500">
            No credit card needed · Cancel anytime
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-6 pt-6 border-t border-white/5">
            <div className="space-y-1">
              <div className="text-3xl font-bold text-white">42k</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">
                Mock interviews run
              </div>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="space-y-1">
              <div className="text-3xl font-bold text-white">+63%</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">
                Avg. confidence boost
              </div>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="space-y-1">
              <div className="text-3xl font-bold text-white">190+</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">
                Teams powered
              </div>
            </div>
          </div>
        </div>

        {/* Right Content - Interview Card */}
        <div className="relative lg:pl-8">
          <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl p-6 lg:p-8 space-y-6 shadow-2xl shadow-black/20">
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                <span className="text-white font-semibold">Live interviewer</span>
              </div>
              <span className="text-gray-500 text-sm font-mono">Recording 02:14</span>
            </div>

            {/* Question Section */}
            <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="text-xs text-cyan-400 uppercase tracking-wider font-semibold">
                Question 3 · Product Sense
              </div>
              <p className="text-white text-lg font-medium leading-relaxed">
                "Walk me through how you would launch a video interview platform
                for remote hiring."
              </p>
            </div>

            {/* AI Notes */}
            <div className="space-y-2">
              <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                AI Notes
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Mention metrics for success and how you would iterate
                post-launch.
              </p>
            </div>

            {/* Delivery Tips */}
            <div className="space-y-2">
              <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Delivery Tips
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Slow down mid-answer; maintain eye contact with the lens for
                stronger presence.
              </p>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <span className="text-gray-500 text-sm">
                Auto transcription · Ready in 30s
              </span>
              <button className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold transition-colors">
                Export
              </button>
            </div>
          </div>

          {/* Decorative glow */}
          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[100px]" />
        </div>
      </div>
    </section>
  );
}