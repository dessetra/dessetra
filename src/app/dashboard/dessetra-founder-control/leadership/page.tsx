"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type LeadershipReward = {
  id: string;
  user_id: string;
  achieved_drv_usd: number | string;
  reward_status: string;
  reward_choice: string | null;
  reward_selected_at: string | null;
  cash_credit_amount_usd: number | string;
  profiles: {
    full_name: string | null;
    email: string | null;
    country: string | null;
    whatsapp_number: string | null;
  } | null;
  leadership_ranks: {
    rank_number: number;
    rank_name: string;
    required_drv_usd: number | string;
    cash_gift_usd: number | string;
    reward_item: string | null;
    item_cash_gift_usd: number | string;
  } | null;
};

export default function FounderLeadershipPage() {
  const [rewards, setRewards] = useState<LeadershipReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    async function loadRewards() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const response = await fetch("/api/admin/leadership/rewards/list", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Unable to load leadership rewards.");
        setLoading(false);
        return;
      }

      setRewards(result.rewards || []);
      setLoading(false);
    }

    void loadRewards();
  }, []);

  const formatMoney = (value: number | string | null | undefined) => {
    return `$${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const updateReward = async (
    userRankId: string,
    action: "approve" | "reject"
  ) => {
    const confirmMessage =
      action === "approve"
        ? "Approve this leadership reward and credit the wallet if applicable?"
        : "Reject this leadership reward?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setUpdatingId(userRankId);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      toast.error("Your session has expired.");
      setUpdatingId("");
      return;
    }

    const response = await fetch("/api/admin/leadership/rewards/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        userRankId,
        action,
      }),
    });

    const result = await response.json();

    setUpdatingId("");

    if (!response.ok) {
      toast.error(result.error || "Unable to update leadership reward.");
      return;
    }

    toast.success(result.message || "Leadership reward updated.");

    setRewards((currentRewards) =>
      currentRewards.map((reward) =>
        reward.id === userRankId
          ? {
              ...reward,
              reward_status: action === "approve" ? "completed" : "rejected",
              cash_credit_amount_usd:
                action === "approve"
                  ? Number(
                      result.cashAmount || reward.cash_credit_amount_usd || 0
                    )
                  : reward.cash_credit_amount_usd,
            }
          : reward
      )
    );
  };

  const eligibleRewards = rewards.filter(
    (reward) => reward.reward_status === "eligible"
  );

  const selectedRewards = rewards.filter(
    (reward) => reward.reward_status === "selected"
  );

  const completedRewards = rewards.filter(
    (reward) => reward.reward_status === "completed"
  );

  const rejectedRewards = rewards.filter(
    (reward) => reward.reward_status === "rejected"
  );

  const getRewardChoiceLabel = (reward: LeadershipReward) => {
    const rank = reward.leadership_ranks;

    if (reward.reward_choice === "cash_gift") {
      return `Cash Gift (${formatMoney(rank?.cash_gift_usd)})`;
    }

    if (reward.reward_choice === "item_reward") {
      return `${rank?.reward_item || "Item Reward"}${
        Number(rank?.item_cash_gift_usd || 0) > 0
          ? ` + ${formatMoney(rank?.item_cash_gift_usd)} Cash Gift`
          : ""
      }`;
    }

    return "No reward selected yet";
  };

  const renderMemberDetails = (reward: LeadershipReward) => {
    const profile = reward.profiles;

    return (
      <>
        <h3 className="mt-1 text-xl font-bold">
          {profile?.full_name || "Unnamed User"}
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          {profile?.email || "No email"} • {profile?.country || "No country"}
        </p>

        {profile?.whatsapp_number && (
          <p className="mt-1 text-sm text-gray-500">
            WhatsApp: {profile.whatsapp_number}
          </p>
        )}
      </>
    );
  };

  return (
    <DashboardLayout>
      <div className="rounded-2xl bg-[#0D2A5E] p-5 shadow-lg md:p-6">
        <h1 className="text-2xl font-bold md:text-3xl">
          Leadership Rewards
        </h1>

        <p className="mt-2 text-sm text-gray-300 md:text-base">
          Review and approve Dessetra Leadership Achievement Rewards.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white p-5 text-[#071A3D] shadow">
          <p className="text-sm font-semibold text-gray-500">Total Rewards</p>
          <p className="mt-2 text-3xl font-bold">
            {loading ? "..." : rewards.length}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 text-[#071A3D] shadow">
          <p className="text-sm font-semibold text-gray-500">
            Awaiting Selection
          </p>
          <p className="mt-2 text-3xl font-bold text-[#1E88E5]">
            {loading ? "..." : eligibleRewards.length}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 text-[#071A3D] shadow">
          <p className="text-sm font-semibold text-gray-500">
            Awaiting Approval
          </p>
          <p className="mt-2 text-3xl font-bold text-[#D4AF37]">
            {loading ? "..." : selectedRewards.length}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 text-[#071A3D] shadow">
          <p className="text-sm font-semibold text-gray-500">Completed</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {loading ? "..." : completedRewards.length}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
        <h2 className="text-xl font-bold">Awaiting User Selection</h2>

        <p className="mt-2 text-sm text-gray-500">
          These members have qualified for a Leadership Achievement Reward, but
          have not selected Cash Gift or Item Reward yet.
        </p>

        {loading ? (
          <p className="mt-4 text-gray-500">Loading rewards...</p>
        ) : eligibleRewards.length === 0 ? (
          <p className="mt-4 text-gray-500">
            No eligible rewards awaiting user selection.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {eligibleRewards.map((reward) => {
              const rank = reward.leadership_ranks;

              return (
                <div
                  key={reward.id}
                  className="rounded-xl border border-[#1E88E5]/30 bg-[#1E88E5]/5 p-5"
                >
                  <p className="text-sm font-semibold text-[#1E88E5]">
                    {rank?.rank_name || "Leadership Rank"}
                  </p>

                  {renderMemberDetails(reward)}

                  <p className="mt-3 text-sm text-gray-600">
                    Achieved DRV:{" "}
                    <strong>{formatMoney(reward.achieved_drv_usd)}</strong>
                  </p>

                  <p className="mt-2 text-sm text-gray-600">
                    Available Options:{" "}
                    <strong>
                      Cash Gift {formatMoney(rank?.cash_gift_usd)}
                    </strong>{" "}
                    or{" "}
                    <strong>
                      {rank?.reward_item || "Item Reward"}
                      {Number(rank?.item_cash_gift_usd || 0) > 0
                        ? ` + ${formatMoney(
                            rank?.item_cash_gift_usd
                          )} Cash Gift`
                        : ""}
                    </strong>
                  </p>

                  <p className="mt-3 text-xs font-semibold text-gray-500">
                    No founder action required yet.
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
        <h2 className="text-xl font-bold">Awaiting Founder Approval</h2>

        {loading ? (
          <p className="mt-4 text-gray-500">Loading rewards...</p>
        ) : selectedRewards.length === 0 ? (
          <p className="mt-4 text-gray-500">
            No selected leadership rewards awaiting approval.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {selectedRewards.map((reward) => {
              const rank = reward.leadership_ranks;
              const isUpdating = updatingId === reward.id;

              return (
                <div
                  key={reward.id}
                  className="rounded-xl border border-gray-200 p-5"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row">
                    <div>
                      <p className="text-sm font-semibold text-[#D4AF37]">
                        {rank?.rank_name || "Leadership Rank"}
                      </p>

                      {renderMemberDetails(reward)}

                      <p className="mt-3 text-sm text-gray-600">
                        Achieved DRV:{" "}
                        <strong>{formatMoney(reward.achieved_drv_usd)}</strong>
                      </p>

                      <p className="mt-2 text-sm text-gray-600">
                        Selected Reward:{" "}
                        <strong>{getRewardChoiceLabel(reward)}</strong>
                      </p>

                      {reward.reward_selected_at && (
                        <p className="mt-2 text-sm text-gray-500">
                          Selected:{" "}
                          {new Date(
                            reward.reward_selected_at
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 md:w-48">
                      <button
                        type="button"
                        onClick={() => updateReward(reward.id, "approve")}
                        disabled={isUpdating}
                        className="rounded-lg bg-[#D4AF37] px-4 py-3 font-semibold text-[#071A3D] disabled:opacity-60"
                      >
                        {isUpdating ? "Processing..." : "Approve"}
                      </button>

                      <button
                        type="button"
                        onClick={() => updateReward(reward.id, "reject")}
                        disabled={isUpdating}
                        className="rounded-lg border border-red-500 px-4 py-3 font-semibold text-red-600 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
        <h2 className="text-xl font-bold">Completed Leadership Rewards</h2>

        {completedRewards.length === 0 ? (
          <p className="mt-4 text-gray-500">
            No completed leadership rewards yet.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {completedRewards.slice(0, 10).map((reward) => (
              <div
                key={reward.id}
                className="rounded-xl border border-gray-200 p-4"
              >
                <p className="font-bold">
                  {reward.profiles?.full_name || "Unnamed User"} —{" "}
                  {reward.leadership_ranks?.rank_name || "Leadership Rank"}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Reward: {getRewardChoiceLabel(reward)}
                </p>

                <p className="mt-1 text-sm text-green-600">
                  Cash Credited: {formatMoney(reward.cash_credit_amount_usd)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {rejectedRewards.length > 0 && (
        <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          <h2 className="text-xl font-bold">Rejected Leadership Rewards</h2>

          <div className="mt-5 space-y-3">
            {rejectedRewards.slice(0, 10).map((reward) => (
              <div
                key={reward.id}
                className="rounded-xl border border-red-200 p-4"
              >
                <p className="font-bold">
                  {reward.profiles?.full_name || "Unnamed User"} —{" "}
                  {reward.leadership_ranks?.rank_name || "Leadership Rank"}
                </p>

                <p className="mt-1 text-sm text-red-600">Rejected</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}