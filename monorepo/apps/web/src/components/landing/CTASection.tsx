"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function CTASection() {
  return (
    <section
      id="cta"
      className="relative py-20 overflow-hidden bg-gradient-to-r from-blue-900 via-purple-900 to-pink-900"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-purple-900/80 to-pink-900/80" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_600px_at_50%_50%,#1e40af,transparent)]" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl sm:text-6xl font-bold text-white mb-6">
          Ready to{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
            modernize
          </span>
          <br />
          your logistics?
        </h2>

        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
          Join thousands of trucking companies already using our platform to
          streamline operations, reduce paperwork, and increase profitability.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <button className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-xl">
            Start Free Trial
          </button>
          <button className="px-8 py-4 border border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-300">
            Schedule Demo
          </button>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {[
            {
              icon: "⚡",
              title: "Quick Setup",
              description: "Get started in under 15 minutes",
            },
            {
              icon: "💰",
              title: "No Hidden Fees",
              description: "Transparent pricing with no surprises",
            },
            {
              icon: "📞",
              title: "24/7 Support",
              description: "Expert help whenever you need it",
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap justify-center items-center gap-8 opacity-70">
          <div className="text-gray-400 text-sm">
            🏆 Award-winning platform
          </div>
          <div className="text-gray-400 text-sm">
            🔒 SOC 2 Type II certified
          </div>
          <div className="text-gray-400 text-sm">
            📊 99.9% uptime guarantee
          </div>
        </div>
      </div>
    </section>
  );
}
