"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

type ReferralProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export default function ReferralsPage() {
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [firstGeneration, setFirstGeneration] = useState<ReferralProfile[]>([]);
  const [secondGeneration, setSecondGeneration] = useState<ReferralProfile[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  const totalFirstGeneration = firstGeneration.length;
  const totalSecondGeneration = secondGeneration.length;
  const totalReferralNetwork = totalFirstGeneration + totalSecondGeneration;

  const referralRewardDP = totalFirstGeneration * 50;

  useEffect(() => {
    async function loadReferralData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user.id)
        .single();

      if (profileError) {
        toast.error(profileError.message);
        setLoading(false);
        return;
      }

      if (profileData?.referral_code) {
        const code = profileData.referral_code;

        setReferralCode(code);
        setReferralLink(`${window.location.origin}/auth/signup?ref=${code}`);
      }

      const { data: firstReferralRows, error: firstReferralRowsError } =
        await supabase
          .from("referrals")
          .select("referred_user_id")
          .eq("referrer_id", user.id);

      if (firstReferralRowsError) {
        toast.error(firstReferralRowsError.message);
        setLoading(false);
        return;
      }

      const firstReferredIds =
        firstReferralRows?.map((row) => row.referred_user_id) || [];

      if (firstReferredIds.length > 0) {
        const { data: firstProfiles, error: firstProfilesError } =
          await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", firstReferredIds);

        if (firstProfilesError) {
          toast.error(firstProfilesError.message);
          setLoading(false);
          return;
        }

        setFirstGeneration(firstProfiles || []);

        const { data: secondReferralRows, error: secondReferralRowsError } =
          await supabase
            .from("referrals")
            .select("referred_user_id")
            .in("referrer_id", firstReferredIds);

        if (secondReferralRowsError) {
          toast.error(secondReferralRowsError.message);
          setLoading(false);
          return;
        }

        const secondReferredIds =
          secondReferralRows?.map((row) => row.referred_user_id) || [];

        if (secondReferredIds.length > 0) {
          const { data: secondProfiles, error: secondProfilesError } =
            await supabase
              .from("profiles")
              .select("id, full_name, email")
              .in("id", secondReferredIds);

          if (secondProfilesError) {
            toast.error(secondProfilesError.message);
            setLoading(false);
            return;
          }

          setSecondGeneration(secondProfiles || []);
        }
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

  const renderReferralList = (
    title: string,
    description: string,
    people: ReferralProfile[],
    emptyMessage: string,
    rewardLabel: string
  ) => {
    return (
      <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
        <h2 className="text-xl font-bold">{title}</h2>

        <p className="mt-2 text-sm text-gray-500">{description}</p>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Loading referrals...</p>
        ) : people.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">{emptyMessage}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {people.map((person, index) => (
              <div
                key={`${person.id}-${index}`}
                className="rounded-xl border border-gray-200 p-4"
              >
                <p className="font-semibold">
                  {person.full_name || "Unnamed User"}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {person.email || "No email available"}
                </p>

                <p className="mt-2 text-xs font-semibold text-[#D4AF37]">
                  {rewardLabel}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="rounded-2xl bg-[#0D2A5E] p-5 shadow-lg md:p-6">
        <h1 className="text-2xl font-bold md:text-3xl">Referral Program</h1>

        <p className="mt-2 text-sm text-gray-300 md:text-base">
          Invite others and grow your Dessetra referral network.
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

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white p-5 text-[#071A3D] shadow">
          <h3 className="font-semibold text-gray-500">First Generation</h3>
          <p className="mt-2 text-3xl font-bold">
            {loading ? "..." : totalFirstGeneration}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 text-[#071A3D] shadow">
          <h3 className="font-semibold text-gray-500">Second Generation</h3>
          <p className="mt-2 text-3xl font-bold">
            {loading ? "..." : totalSecondGeneration}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 text-[#071A3D] shadow">
          <h3 className="font-semibold text-gray-500">Total Network</h3>
          <p className="mt-2 text-3xl font-bold">
            {loading ? "..." : totalReferralNetwork}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 text-[#071A3D] shadow">
          <h3 className="font-semibold text-gray-500">Referral Rewards</h3>
          <p className="mt-2 text-3xl font-bold">
            {loading ? "..." : `${referralRewardDP} DP`}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            DP reward currently applies to first generation signups.
          </p>
        </div>
      </div>

      {renderReferralList(
        "First Generation Referrals",
        "These are users who signed up directly through your referral link.",
        firstGeneration,
        "You have no first generation referrals yet.",
        "Direct Referral • +50 DP"
      )}

      {renderReferralList(
        "Second Generation Referrals",
        "These are users referred by your first generation referrals.",
        secondGeneration,
        "You have no second generation referrals yet.",
        "Second Generation Referral"
      )}
    </DashboardLayout>
  );
}