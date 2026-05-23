"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
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
    <DashboardLayout>
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
    </DashboardLayout>
  );
}