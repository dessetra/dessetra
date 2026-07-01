import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json(
        { error: "Leadership server configuration is incomplete." },
        { status: 500 }
      );
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: volume } = await adminClient
      .from("leadership_user_volume")
      .select("direct_referral_count, direct_referral_volume_usd, current_rank_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: ranks, error: ranksError } = await adminClient
      .from("leadership_ranks")
      .select(
        "id, rank_number, rank_key, rank_name, required_drv_usd, cash_gift_usd, reward_item, item_reward_description, item_cash_gift_usd, reward_type"
      )
      .eq("is_active", true)
      .order("rank_number", { ascending: true });

    if (ranksError) {
      return NextResponse.json({ error: ranksError.message }, { status: 500 });
    }

    const { data: achieved } = await adminClient
      .from("leadership_user_ranks")
      .select(
  "id, rank_id, reward_status, reward_choice, was_subscription_active, reward_selected_at, cash_credit_amount_usd"
)
      .eq("user_id", user.id);

    const currentDrv = Number(volume?.direct_referral_volume_usd || 0);
    const currentRank =
      ranks?.find((rank) => rank.id === volume?.current_rank_id) || null;

    const nextRank =
      ranks?.find((rank) => Number(rank.required_drv_usd) > currentDrv) || null;

    return NextResponse.json({
      directReferralCount: Number(volume?.direct_referral_count || 0),
      directReferralVolumeUsd: currentDrv,
      currentRank,
      nextRank,
      ranks: ranks || [],
      achievedRanks: achieved || [],
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load leadership summary." },
      { status: 500 }
    );
  }
}