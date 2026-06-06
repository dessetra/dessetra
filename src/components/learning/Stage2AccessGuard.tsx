"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

export default function Stage2AccessGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { count } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user.id);

      const total = count || 0;

      setReferralCount(total);
      setUnlocked(total >= 5);
      setLoading(false);
    }

    checkAccess();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl bg-[#0D2A5E] p-6">
          Checking Module 2 access...
        </div>
      </DashboardLayout>
    );
  }

  if (!unlocked) {
    return (
      <DashboardLayout>
        <div className="rounded-3xl bg-[#0D2A5E] p-6 text-white">
          <h1 className="text-3xl font-bold">Module 2 Locked</h1>

          <p className="mt-3 text-gray-300">
            You need 5 referrals to unlock Module 2.
          </p>

          <p className="mt-4 font-semibold text-[#D4AF37]">
            Current referrals: {referralCount}/5
          </p>

          <Link
            href="/dashboard/referrals"
            className="mt-6 inline-block rounded-lg bg-[#D4AF37] px-5 py-3 font-semibold text-[#071A3D]"
          >
            Go To Referrals
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return <>{children}</>;
}