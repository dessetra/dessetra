"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function ReferralsPage() {
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReferralData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user.id)
        .single();

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      if (data?.referral_code) {
        const code = data.referral_code;

        setReferralCode(code);
        setReferralLink(`${window.location.origin}/auth/signup?ref=${code}`);
      }

      setLoading(false);
    }

    loadReferralData();
  }, []);

  const copyReferralLink = async () => {
    if (!referralLink) {
      toast.error("Referral link is not ready yet.");
      return;
    }

    await navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied.");
  };

  return (
    <DashboardLayout>
      <div className="rounded-2xl bg-[#0D2A5E] p-5 shadow-lg md:p-6">
        <h1 className="text-2xl font-bold md:text-3xl">
          Referral Program
        </h1>

        <p className="mt-2 text-sm text-gray-300 md:text-base">
          Invite others and earn rewards as Dessetra grows.
        </p>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
        <h2 className="text-xl font-bold">Your Referral Code</h2>

        <div className="mt-4 rounded-lg bg-gray-100 p-4 font-mono text-lg">
          {loading ? "Loading..." : referralCode || "No referral code found"}
        </div>

        <h2 className="mt-6 text-xl font-bold">Your Referral Link</h2>

        <div className="mt-4 break-all rounded-lg bg-gray-100 p-4 text-sm">
          {loading ? "Generating..." : referralLink || "No referral link found"}
        </div>

        <button
          onClick={copyReferralLink}
          className="mt-5 rounded-lg bg-[#D4AF37] px-5 py-3 font-semibold"
        >
          Copy Referral Link
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 text-[#071A3D] shadow">
          <h3 className="font-semibold text-gray-500">Total Referrals</h3>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>

        <div className="rounded-xl bg-white p-5 text-[#071A3D] shadow">
          <h3 className="font-semibold text-gray-500">Successful Referrals</h3>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>

        <div className="rounded-xl bg-white p-5 text-[#071A3D] shadow">
          <h3 className="font-semibold text-gray-500">Referral Rewards</h3>
          <p className="mt-2 text-3xl font-bold">0 DP</p>
        </div>
      </div>
    </DashboardLayout>
  );
}