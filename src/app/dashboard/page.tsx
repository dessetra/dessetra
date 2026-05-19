"use client";

import { useEffect, useState } from "react";
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

  return (
    <main className="min-h-screen bg-[#071A3D] text-white p-6">
      <div className="max-w-6xl mx-auto">

        <div className="bg-[#0D2A5E] rounded-2xl p-6 shadow-lg">
          <h1 className="text-3xl font-bold">
            Welcome, {userName}
          </h1>

          <p className="mt-2 text-gray-300">
            Dessetra Dashboard — Learn • Connect • Earn
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mt-8">
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

      </div>
    </main>
  );
}