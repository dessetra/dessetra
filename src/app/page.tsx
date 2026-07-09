"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Footer from "@/components/shared/Footer";

const sections = [
  {
    title: "Learn Web3 With Confidence",
    text: "Start from the basics and understand crypto, blockchain, wallets, security, trading, and digital opportunities before risking your money.",
    image: "/images/learn-web3.webp",
    reverse: false,
  },
  {
    title: "Connect With a Growing Digital Community",
    text: "Meet learners, builders, traders, investors, and opportunity seekers who are preparing for the future of finance and technology.",
    image: "/images/connect-community.webp",
    reverse: true,
  },
  {
    title: "Invest and Track Your Growth",
    text: "Explore Dessetra investment packages, monitor your progress, view earnings, and follow your portfolio from your personal dashboard.",
    image: "/images/invest-growth.webp",
    reverse: false,
  },
  {
    title: "Build Trading Knowledge",
    text: "Learn the foundations of Forex, Futures, market psychology, risk management, and smarter trading habits.",
    image: "/images/trading-room.webp",
    reverse: true,
  },
  {
    title: "Powered by AI and Practical Learning",
    text: "Dessetra combines Web3 education, AI-assisted learning, market summaries, and practical digital skills for the modern economy.",
    image: "/images/ai-learning.webp",
    reverse: false,
  },
  {
    title: "Grow Through Referrals",
    text: "Invite others, build your network, earn Dessetra Points, and grow together as the platform expands.",
    image: "/images/referral-network.webp",
    reverse: true,
  },
];

function HomeContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  const signupHref = ref
    ? `/auth/signup?ref=${encodeURIComponent(ref)}&from=landing`
    : "/auth/signup";

  return (
    <main className="min-h-screen bg-[#071A3D] text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/hero-web3.webp"
            alt="Web3 digital learning background"
            fill
            priority
            className="object-cover"
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-[#071A3D]/80 via-[#071A3D]/95 to-[#071A3D]" />

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-24 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">
            Learn • Connect • Earn
          </p>

          <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
            Start Your Web3 Journey the Right Way
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-gray-300">
            Learn Web3, crypto, trading, AI tools, and digital wealth skills
            while connecting with opportunities built for the future.
          </p>


          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href={signupHref}
              className="rounded-lg bg-[#D4AF37] px-6 py-3 font-semibold text-[#071A3D]"
            >
              Get Started for Free
            </Link>

            <Link
              href="/auth/login"
              className="rounded-lg border border-white/30 px-6 py-3 font-semibold text-white"
            >
              Login
            </Link>
          </div>

          <div className="mt-12 grid w-full gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
              <p className="text-3xl font-bold text-[#D4AF37]">Web3</p>
              <p className="mt-2 text-sm text-gray-300">
                Learn blockchain, wallets, crypto safety, and digital finance.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
              <p className="text-3xl font-bold text-[#D4AF37]">Trading</p>
              <p className="mt-2 text-sm text-gray-300">
                Build knowledge in Forex, Futures, risk, and market psychology.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
              <p className="text-3xl font-bold text-[#D4AF37]">Earn</p>
              <p className="mt-2 text-sm text-gray-300">
                Grow through referrals, learning progress, and opportunities.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
            Why Dessetra?
          </p>

          <h2 className="mt-3 text-3xl font-bold md:text-5xl">
            A Practical Platform for Digital Wealth Education
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-gray-300">
            Dessetra helps beginners and growing digital entrepreneurs learn,
            connect, invest, and participate in the Web3 economy with better
            understanding and structure.
          </p>
        </div>

        <div className="mt-14 space-y-16">
          {sections.map((section) => (
            <div
              key={section.title}
              className={`grid items-center gap-8 md:grid-cols-2 ${
                section.reverse ? "md:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/10 shadow-2xl">
                <Image
                  src={section.image}
                  alt={section.title}
                  width={900}
                  height={600}
                  className="h-72 w-full object-cover md:h-96"
                />
              </div>

              <div>
                <h3 className="text-2xl font-bold md:text-4xl">
                  {section.title}
                </h3>

                <p className="mt-4 text-lg leading-8 text-gray-300">
                  {section.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#04122D] px-6 py-20">
        <div className="mx-auto max-w-6xl rounded-3xl border border-[#D4AF37]/30 bg-[#0D2A5E] p-8 text-center shadow-2xl md:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
            Join Dessetra
          </p>

          <h2 className="mt-3 text-3xl font-bold md:text-5xl">
            Build Your Digital Future With Confidence
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-gray-300">
            Create a free account, start learning, invite others, and explore
            the opportunities available through Dessetra.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href={signupHref}
              className="rounded-lg bg-[#D4AF37] px-6 py-3 font-semibold text-[#071A3D]"
            >
              Create Free Account
            </Link>

            <Link
              href="/auth/login"
              className="rounded-lg border border-white/30 px-6 py-3 font-semibold text-white"
            >
              Login
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#071A3D]" />}>
      <HomeContent />
    </Suspense>
  );
}