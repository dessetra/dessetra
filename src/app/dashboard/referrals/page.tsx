"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

type ReferralStatus = "pending" | "verified" | string;

type ReferralProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  status: ReferralStatus;
};

type LeadershipRank = {
  id: string;
  rank_number: number;
  rank_name: string;
  required_drv_usd: number | string;
  cash_gift_usd: number | string;
  reward_item: string | null;
  item_reward_description: string | null;
  item_cash_gift_usd: number | string;
};

type AchievedRank = {
  id: string;
  rank_id: string;
  reward_status: string;
  reward_choice: string | null;
  was_subscription_active: boolean;
  reward_selected_at: string | null;
  cash_credit_amount_usd: number | string;
};
type LeadershipSummary = {
  directReferralCount: number;
  directReferralVolumeUsd: number;
  currentRank: LeadershipRank | null;
  nextRank: LeadershipRank | null;
  ranks: LeadershipRank[];
  achievedRanks: AchievedRank[];
};

export default function ReferralsPage() {
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [firstGeneration, setFirstGeneration] = useState<ReferralProfile[]>([]);
  const [secondGeneration, setSecondGeneration] = useState<ReferralProfile[]>(
    []
  );
  const [leadership, setLeadership] = useState<LeadershipSummary | null>(null);
  const [rankModalOpen, setRankModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const verifiedFirstGeneration = firstGeneration.filter(
    (person) => person.status === "verified"
  );

  const pendingFirstGeneration = firstGeneration.filter(
    (person) => person.status !== "verified"
  );

  const totalFirstGeneration = firstGeneration.length;
  const totalSecondGeneration = secondGeneration.length;
  const totalReferralNetwork = totalFirstGeneration + totalSecondGeneration;
  const referralRewardDP = verifiedFirstGeneration.length * 50;

  const currentDrv = leadership?.directReferralVolumeUsd || 0;
  const nextRankRequired = Number(leadership?.nextRank?.required_drv_usd || 0);
  const progressPercent =
    nextRankRequired > 0
      ? Math.min((currentDrv / nextRankRequired) * 100, 100)
      : 100;
  const remainingToNextRank =
    nextRankRequired > 0 ? Math.max(nextRankRequired - currentDrv, 0) : 0;

  useEffect(() => {
    async function loadReferralData() {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user || !session.access_token) {
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", session.user.id)
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

      const [referralResponse, leadershipResponse] = await Promise.all([
        fetch("/api/referrals/network", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }),

        fetch("/api/leadership/summary", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }),
      ]);

      const referralResult = await referralResponse.json();

      if (!referralResponse.ok) {
        toast.error(referralResult.error || "Unable to load referral network.");
        setLoading(false);
        return;
      }

      setFirstGeneration(referralResult.firstGeneration || []);
      setSecondGeneration(referralResult.secondGeneration || []);

      if (leadershipResponse.ok) {
        const leadershipResult = await leadershipResponse.json();
        setLeadership(leadershipResult);
      }

      setLoading(false);
    }

    void loadReferralData();
  }, []);

  const copyReferralLink = async () => {
    if (!referralLink) {
      toast.error("Referral link is not ready yet.");
      return;
    }

    await navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied.");
  };

  const formatMoney = (value: number | string | null | undefined) => {
    return `$${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const getAchievedRank = (rankId: string) => {
  return (
    leadership?.achievedRanks?.find(
      (achievement) => achievement.rank_id === rankId
    ) || null
  );
};

const selectReward = async (
  userRankId: string,
  rewardChoice: "cash_gift" | "item_reward"
) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    toast.error("Your session has expired.");
    return;
  }

  const response = await fetch("/api/leadership/select-reward", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      userRankId,
      rewardChoice,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    toast.error(result.error || "Unable to save reward choice.");
    return;
  }

  toast.success("Reward choice submitted.");

  window.location.reload();
};

  const getReferralStatusLabel = (status: ReferralStatus) => {
    if (status === "verified") {
      return "Verified Referral • +50 DP";
    }

    return "Pending Email Verification • 0 DP";
  };

  const getReferralStatusClass = (status: ReferralStatus) => {
    if (status === "verified") {
      return "text-[#D4AF37]";
    }

    return "text-orange-600";
  };

  const renderReferralList = (
    title: string,
    description: string,
    people: ReferralProfile[],
    emptyMessage: string,
    isFirstGeneration = false
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
            {people.map((person) => (
              <div
                key={person.id}
                className="rounded-xl border border-gray-200 p-4"
              >
                <p className="font-semibold">
                  {person.full_name || "Unnamed User"}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {person.email || "No email available"}
                </p>

                <p
                  className={`mt-2 text-xs font-semibold ${getReferralStatusClass(
                    person.status
                  )}`}
                >
                  {isFirstGeneration
                    ? getReferralStatusLabel(person.status)
                    : person.status === "verified"
                    ? "Verified Second Generation Referral"
                    : "Pending Second Generation Email Verification"}
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
          Invite others, grow your Dessetra network, and progress through the
          Leadership Ranking Program.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-[#D4AF37]/30 bg-[#04122D] p-6 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
          Leadership Progress
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-gray-400">Current Rank</p>
            <p className="mt-1 text-2xl font-bold">
              {loading
                ? "..."
                : leadership?.currentRank?.rank_name || "No Rank Yet"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-400">Direct Referral Volume</p>
            <p className="mt-1 text-2xl font-bold text-[#D4AF37]">
              {loading ? "..." : formatMoney(currentDrv)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-400">Next Rank</p>
            <p className="mt-1 text-2xl font-bold">
              {loading
                ? "..."
                : leadership?.nextRank?.rank_name || "Highest Rank Reached"}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-sm text-gray-300">
            <span>
              {leadership?.nextRank
                ? `${formatMoney(currentDrv)} / ${formatMoney(
                    nextRankRequired
                  )}`
                : "All active ranks completed"}
            </span>

            <span>
              {leadership?.nextRank
                ? `${formatMoney(remainingToNextRank)} remaining`
                : "100%"}
            </span>
          </div>

          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-[#D4AF37]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRankModalOpen(true)}
          className="mt-5 rounded-lg bg-[#D4AF37] px-5 py-3 font-semibold text-[#071A3D]"
        >
          View All Leadership Ranks
        </button>
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
          <p className="mt-2 text-xs text-gray-500">
            {loading
              ? ""
              : `${verifiedFirstGeneration.length} verified, ${pendingFirstGeneration.length} pending`}
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
            Only verified first-generation referrals earn +50 DP.
          </p>
        </div>
      </div>

      {renderReferralList(
        "First Generation Referrals",
        "These are users who signed up directly through your referral link.",
        firstGeneration,
        "You have no first generation referrals yet.",
        true
      )}

      {renderReferralList(
        "Second Generation Referrals",
        "These are users referred by your first generation referrals.",
        secondGeneration,
        "You have no second generation referrals yet."
      )}

      {rankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 text-[#071A3D] shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                  Leadership Ranking Program
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  Dessetra Leadership Ranks
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setRankModalOpen(false)}
                className="rounded-lg bg-gray-100 px-4 py-2 font-bold"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {(leadership?.ranks || []).map((rank) => {
           const achievedRank = getAchievedRank(rank.id);
           const achieved = Boolean(achievedRank);
           const canSelectReward = achievedRank?.reward_status === "eligible";
           const selectedReward = achievedRank?.reward_choice;

        return (
                  <div
                    key={rank.id}
                    className={`rounded-xl border p-4 ${
                      achieved
                        ? "border-[#D4AF37] bg-[#D4AF37]/10"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="text-sm font-semibold text-gray-500">
                          Rank {rank.rank_number}
                        </p>

                        <h3 className="text-xl font-bold">{rank.rank_name}</h3>

                        <p className="mt-2 text-sm text-gray-600">
                          Required DRV:{" "}
                          <span className="font-bold">
                            {formatMoney(rank.required_drv_usd)}
                          </span>
                        </p>

                        <p className="mt-2 text-sm text-gray-600">
                          Option A: Cash Gift of{" "}
                          <span className="font-bold">
                            {formatMoney(rank.cash_gift_usd)}
                          </span>
                        </p>

                        <p className="mt-2 text-sm text-gray-600">
                          Option B:{" "}
                          <span className="font-bold">
                            {rank.reward_item || "Reward Item"}
                          </span>
                          {Number(rank.item_cash_gift_usd || 0) > 0
                            ? ` + ${formatMoney(
                                rank.item_cash_gift_usd
                              )} Cash Gift`
                            : ""}
                        </p>

                        {rank.item_reward_description && (
                          <p className="mt-2 text-sm text-gray-500">
                            {rank.item_reward_description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-start gap-3 md:items-end">
  <div
    className={`rounded-full px-4 py-2 text-sm font-semibold ${
      achieved
        ? "bg-[#D4AF37] text-[#071A3D]"
        : "bg-gray-100 text-gray-600"
    }`}
  >
    {achieved ? "Achieved" : "Not Yet"}
  </div>

  {canSelectReward && achievedRank && (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        onClick={() => selectReward(achievedRank.id, "cash_gift")}
        className="rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#071A3D]"
      >
        Choose Cash Gift
      </button>

      <button
        type="button"
        onClick={() => selectReward(achievedRank.id, "item_reward")}
        className="rounded-lg bg-[#071A3D] px-4 py-2 text-sm font-semibold text-white"
      >
        Choose Item Reward
      </button>
    </div>
  )}

  {selectedReward && achievedRank?.reward_status === "selected" && (
    <p className="text-sm font-semibold text-[#1E88E5]">
      Selected:{" "}
      {selectedReward === "cash_gift" ? "Cash Gift" : "Item Reward"}
    </p>
  )}

  {achievedRank?.reward_status === "forfeited" && (
    <p className="text-sm font-semibold text-red-600">
      Reward forfeited due to inactive subscription.
    </p>
  )}

  {achievedRank?.reward_status === "completed" && (
    <p className="text-sm font-semibold text-green-600">
      Reward completed.
    </p>
  )}
</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 text-sm text-gray-500">
              Rank progression is based only on Direct Referral Volume from
              personally referred users. Second-generation volume does not count
              toward leadership rank progression.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}