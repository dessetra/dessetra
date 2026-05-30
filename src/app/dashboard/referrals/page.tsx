"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

type ReferralProfile = {
  full_name: string | null;
  email: string | null;
};

export default function ReferralsPage() {
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [firstGeneration, setFirstGeneration] = useState<ReferralProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const referralRewardDP = totalReferrals * 50;

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

      const { count, error: referralError } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user.id);

      if (referralError) {
        toast.error(referralError.message);
        setLoading(false);
        return;
      }

      setTotalReferrals(count || 0);

      const { data: referralRows, error: referralRowsError } = await supabase
        .from("referrals")
        .select("referred_user_id")
        .eq("referrer_id", user.id);

      if (referralRowsError) {
        toast.error(referralRowsError.message);
        setLoading(false);
        return;
      }

      if (referralRows && referralRows.length > 0) {
        const referredIds = referralRows.map((row) => row.referred_user_id);

        const { data: referredProfiles, error: referredProfilesError } =
          await supabase
            .from("profiles")
            .select("full_name,email")
            .in("id", referredIds);

        if (referredProfilesError) {
          toast.error(referredProfilesError.message);
          setLoading(false);
          return;
        }

        setFirstGeneration(referredProfiles || []);
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
        <h1 className="text-2xl font-bold md:text-3xl">Referral Program</h1>

        <p className="mt-2 text-sm text-gray-300 md:text-base">
          Invite others and earn Dessetra Points as the platform grows.
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
          <p className="mt-2 text-3xl font-bold">
            {loading ? "..." : totalReferrals}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 text-[#071A3D] shadow">
          <h3 className="font-semibold text-gray-500">Successful Referrals</h3>
          <p className="mt-2 text-3xl font-bold">0</p>
          <p className="mt-2 text-xs text-gray-500">
            Successful referrals will count after payment or subscription.
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 text-[#071A3D] shadow">
          <h3 className="font-semibold text-gray-500">Referral Rewards</h3>
          <p className="mt-2 text-3xl font-bold">
            {loading ? "..." : `${referralRewardDP} DP`}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            50 DP for each referred user.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
        <h2 className="text-xl font-bold">First Generation Referrals</h2>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Loading referrals...</p>
        ) : firstGeneration.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            You have no first generation referrals yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {firstGeneration.map((person, index) => (
              <div
                key={`${person.email}-${index}`}
                className="rounded-xl border border-gray-200 p-4"
              >
                <p className="font-semibold">
                  {person.full_name || "Unnamed User"}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {person.email || "No email available"}
                </p>

                <p className="mt-2 text-xs font-semibold text-[#D4AF37]">
                  Pending Referral • +50 DP
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}