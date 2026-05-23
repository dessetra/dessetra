"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Learn", href: "/dashboard/learn" },
  { label: "Referrals", href: "/dashboard/referrals" },
  { label: "Earnings", href: "/dashboard/earnings" },
  { label: "Wallet", href: "/dashboard/wallet" },
  { label: "Profile", href: "/dashboard/profile" },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  return (
    <main className="min-h-screen bg-[#071A3D] text-white">
      <div className="md:flex min-h-screen">
        <aside className="bg-[#04122D] p-5 md:w-64 md:min-h-screen">
          <h1 className="text-2xl font-bold text-[#D4AF37]">Dessetra</h1>
          <p className="mt-1 text-sm text-gray-400">Learn • Connect • Earn</p>

          <nav className="mt-6 grid grid-cols-2 gap-2 md:block md:space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg bg-[#0D2A5E]/60 px-3 py-2 text-sm hover:bg-[#0D2A5E] md:px-4 md:py-3 md:text-base"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="mt-5 w-full rounded-lg bg-[#D4AF37] px-4 py-3 font-semibold text-[#071A3D]"
          >
            Logout
          </button>
        </aside>

        <section className="flex-1 p-4 md:p-6">{children}</section>
      </div>
    </main>
  );
}