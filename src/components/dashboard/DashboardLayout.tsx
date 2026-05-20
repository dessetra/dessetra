"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  return (
    <main className="min-h-screen bg-[#071A3D] text-white">
      <div className="flex min-h-screen">
        <aside className="w-64 shrink-0 bg-[#04122D] p-6 border-r border-[#0D2A5E]">
          <h1 className="text-2xl font-bold text-[#D4AF37]">Dessetra</h1>
          <p className="mt-1 text-sm text-gray-400">Learn • Connect • Earn</p>

          <nav className="mt-10 space-y-3">
            <Link href="/dashboard" className="block rounded-lg px-4 py-3 hover:bg-[#0D2A5E]">
              Dashboard
            </Link>

            <Link href="/dashboard/learn" className="block rounded-lg px-4 py-3 hover:bg-[#0D2A5E]">
              Learn
            </Link>

            <Link href="/dashboard/referrals" className="block rounded-lg px-4 py-3 hover:bg-[#0D2A5E]">
              Referrals
            </Link>

            <Link href="/dashboard/earnings" className="block rounded-lg px-4 py-3 hover:bg-[#0D2A5E]">
              Earnings
            </Link>

            <Link href="/dashboard/wallet" className="block rounded-lg px-4 py-3 hover:bg-[#0D2A5E]">
              Wallet
            </Link>

            <Link href="/dashboard/profile" className="block rounded-lg px-4 py-3 hover:bg-[#0D2A5E]">
              Profile
            </Link>
          </nav>

          <button
            onClick={handleLogout}
            className="mt-10 w-full rounded-lg bg-[#D4AF37] px-4 py-3 font-semibold text-[#071A3D]"
          >
            Logout
          </button>
        </aside>

        <section className="flex-1 p-6">{children}</section>
      </div>
    </main>
  );
}