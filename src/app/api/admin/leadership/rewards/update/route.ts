import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RewardChoice = "cash_gift" | "item_reward";
type RewardAction = "approve" | "reject";

type LeadershipRewardRecord = {
  id: string;
  user_id: string;
  reward_status: string;
  reward_choice: RewardChoice | null;
  rank_id: string;
  leadership_ranks: {
    rank_name: string;
    cash_gift_usd: number | string;
    item_cash_gift_usd: number | string;
  } | null;
};

async function verifyFounder(request: Request) {
  const authHeader = request.headers.get("authorization") || "";

  if (!authHeader.startsWith("Bearer ")) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) return null;

  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: admin } = await adminClient
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "founder")
    .maybeSingle();

  if (!admin) return null;

  return { adminClient, founderId: user.id };
}

export async function POST(request: Request) {
  try {
    const verified = await verifyFounder(request);

    if (!verified) {
      return NextResponse.json(
        { error: "Founder access required." },
        { status: 403 }
      );
    }

    const { adminClient, founderId } = verified;
    const { userRankId, action, adminNote } = await request.json();

    if (!userRankId) {
      return NextResponse.json(
        { error: "Missing userRankId." },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const cleanAction = action as RewardAction;
    const cleanAdminNote = String(adminNote || "").trim();

    const { data: rewardData, error: rewardError } = await adminClient
      .from("leadership_user_ranks")
      .select(
        `
        id,
        user_id,
        reward_status,
        reward_choice,
        rank_id,
        leadership_ranks (
          rank_name,
          cash_gift_usd,
          item_cash_gift_usd
        )
      `
      )
      .eq("id", userRankId)
      .maybeSingle();

    if (rewardError) {
      return NextResponse.json({ error: rewardError.message }, { status: 500 });
    }

    const reward = rewardData as LeadershipRewardRecord | null;

    if (!reward) {
      return NextResponse.json(
        { error: "Leadership reward not found." },
        { status: 404 }
      );
    }

    if (reward.reward_status !== "selected") {
      return NextResponse.json(
        { error: "This reward is not awaiting founder action." },
        { status: 400 }
      );
    }

    if (!reward.reward_choice) {
      return NextResponse.json(
        { error: "No reward choice was selected." },
        { status: 400 }
      );
    }

    const rank = reward.leadership_ranks;

    if (!rank) {
      return NextResponse.json(
        { error: "Rank configuration not found." },
        { status: 404 }
      );
    }

    if (cleanAction === "reject") {
      const { error: rejectError } = await adminClient
        .from("leadership_user_ranks")
        .update({
          reward_status: "rejected",
          approved_by: founderId,
          approved_at: new Date().toISOString(),
          admin_note: cleanAdminNote || null,
        })
        .eq("id", reward.id)
        .eq("reward_status", "selected");

      if (rejectError) {
        return NextResponse.json(
          { error: rejectError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Leadership reward rejected successfully.",
      });
    }

    const cashAmount =
      reward.reward_choice === "cash_gift"
        ? Number(rank.cash_gift_usd || 0)
        : Number(rank.item_cash_gift_usd || 0);

    let walletTransactionId: string | null = null;

    if (cashAmount > 0) {
      const { data: walletData, error: walletError } = await adminClient
        .from("wallet_transactions")
        .insert({
          user_id: reward.user_id,
          transaction_type: "leadership_reward",
          amount_usd: cashAmount,
          currency: "USDT_BEP20",
          direction: "credit",
          status: "completed",
          description: `Leadership reward approved for ${rank.rank_name}`,
          reference_table: "leadership_user_ranks",
          reference_id: reward.id,
        })
        .select("id")
        .single();

      if (walletError) {
        return NextResponse.json(
          { error: walletError.message },
          { status: 500 }
        );
      }

      walletTransactionId = walletData.id as string;
    }

    const { error: updateError } = await adminClient
      .from("leadership_user_ranks")
      .update({
        reward_status: "completed",
        approved_by: founderId,
        approved_at: new Date().toISOString(),
        reward_claimed_at: new Date().toISOString(),
        cash_credit_amount_usd: cashAmount,
        wallet_transaction_id: walletTransactionId,
        admin_note: cleanAdminNote || null,
      })
      .eq("id", reward.id)
      .eq("reward_status", "selected");

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Leadership reward approved successfully.",
      cashAmount,
      walletTransactionId,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to update leadership reward." },
      { status: 500 }
    );
  }
}