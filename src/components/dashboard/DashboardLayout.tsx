"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Footer from "@/components/shared/Footer";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Learn", href: "/dashboard/learn" },
  { label: "Subscriptions", href: "/dashboard/subscriptions" },
  { label: "Invest", href: "/dashboard/invest" },
  { label: "Investor Dashboard", href: "/dashboard/investor" },
  { label: "Referrals", href: "/dashboard/referrals" },
  { label: "Earnings", href: "/dashboard/earnings" },
  { label: "Wallet", href: "/dashboard/wallet" },
  { label: "Profile", href: "/dashboard/profile" },
  {
    label: "Support",
    href: "mailto:support@dessetra.com?subject=Dessetra%20Support%20Request",
  },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/auth/login");
        return;
      }

      setCheckingAuth(false);
    }

    void checkSession();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  };

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#071A3D] text-white">
        <p>Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#071A3D] text-white">
      <header className="sticky top-0 z-40 flex items-center justify-between bg-[#04122D] px-5 py-4 shadow-lg md:hidden">
        <div>
          <h1 className="text-2xl font-bold text-[#D4AF37]">Dessetra</h1>
          <p className="text-xs text-gray-400">Learn • Connect • Earn</p>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="rounded-lg bg-[#0D2A5E] px-4 py-2 text-2xl font-bold"
          aria-label="Open menu"
        >
          ☰
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu overlay"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/60"
          />

          <aside className="relative z-10 min-h-screen w-80 max-w-[85%] bg-[#04122D] p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#D4AF37]">Dessetra</h1>
                <p className="mt-1 text-sm text-gray-400">
                  Learn • Connect • Earn
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg bg-[#0D2A5E] px-3 py-2 text-xl font-bold"
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <nav className="mt-6 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg bg-[#0D2A5E]/70 px-4 py-3 text-base hover:bg-[#0D2A5E]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <button
              onClick={handleLogout}
              className="mt-6 w-full rounded-lg bg-[#D4AF37] px-4 py-3 font-semibold text-[#071A3D]"
            >
              Logout
            </button>
          </aside>
        </div>
      )}

      <div className="min-h-screen md:flex">
        <aside className="hidden bg-[#04122D] p-5 md:block md:min-h-screen md:w-64">
          <h1 className="text-2xl font-bold text-[#D4AF37]">Dessetra</h1>

          <p className="mt-1 text-sm text-gray-400">
            Learn • Connect • Earn
          </p>

          <nav className="mt-6 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg bg-[#0D2A5E]/60 px-4 py-3 text-base hover:bg-[#0D2A5E]"
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

        <section className="flex min-h-screen flex-1 flex-col">
          <div className="flex-1 p-4 md:p-6">{children}</div>

          <Footer />
        </section>
      </div>

      <Link
        href="/dashboard/invest"
        className="fixed bottom-6 right-6 z-40 rounded-full bg-[#D4AF37] px-6 py-4 font-bold text-[#071A3D] shadow-2xl hover:scale-105"
      >
        Invest
      </Link>
    </main>
  );
}