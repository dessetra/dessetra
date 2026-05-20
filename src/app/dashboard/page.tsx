"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";

export default function DashboardPage() {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserName(user.user_metadata.full_name || "User");
      }
    }

    getUser();
  }, []);

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
            {[
              ["Dashboard", "/dashboard"],
              ["Learn", "/dashboard/learn"],
              ["Referrals", "/dashboard/referrals"],
              ["Earnings", "/dashboard/earnings"],
              ["Wallet", "/dashboard/wallet"],
              ["Profile", "/dashboard/profile"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="block rounded-lg bg-[#0D2A5E]/60 px-3 py-2 text-sm hover:bg-[#0D2A5E] md:px-4 md:py-3 md:text-base"
              >
                {label}
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

        <section className="flex-1 p-4 md:p-6">
          <div className="rounded-2xl bg-[#0D2A5E] p-5 shadow-lg md:p-6">
            <h1 className="text-2xl font-bold md:text-3xl">
              Welcome, {userName}
            </h1>

            <p className="mt-2 text-sm text-gray-300 md:text-base">
              Dessetra Dashboard — Learn • Connect • Earn
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DashboardStatCard
              title="Courses"
              value="0"
              subtitle="Courses enrolled"
            />

            <DashboardStatCard
              title="Referrals"
              value="0"
              subtitle="Invited users"
            />

            <DashboardStatCard
              title="Estimated Earnings"
              value="$0"
              subtitle="Pending rewards"
            />
          </div>
        </section>
      </div>
    </main>
  );
}