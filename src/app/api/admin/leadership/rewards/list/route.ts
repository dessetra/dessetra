import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  return { adminClient };
}

export async function GET(request: Request) {
  try {
    const verified = await verifyFounder(request);

    if (!verified) {
      return NextResponse.json(
        { error: "Founder access required." },
        { status: 403 }
      );
    }

    const { adminClient } = verified;

    const { data: rewardsData, error: rewardsError } = await adminClient
      .from("leadership_user_ranks")
      .select(
        `
        id,
        user_id,
        achieved_drv_usd,
        was_subscription_active,
        reward_status,
        reward_choice,
        reward_selected_at,
        reward_claimed_at,
        cash_credit_amount_usd,
        admin_note,
        created_at,
        leadership_ranks (
          rank_number,
          rank_name,
          required_drv_usd,
          cash_gift_usd,
          reward_item,
          item_cash_gift_usd
        )
      `
      )
      .in("reward_status", [
        "eligible",
        "selected",
        "processing",
        "completed",
        "rejected",
        "forfeited",
      ])
      .order("created_at", { ascending: false });

    if (rewardsError) {
      return NextResponse.json(
        { error: rewardsError.message },
        { status: 500 }
      );
    }

    const rewards = rewardsData || [];
    const userIds = Array.from(new Set(rewards.map((reward) => reward.user_id)));

    let profilesById: Record<string, unknown> = {};

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await adminClient
        .from("profiles")
        .select("id, full_name, email, country, whatsapp_number")
        .in("id", userIds);

      if (profilesError) {
        return NextResponse.json(
          { error: profilesError.message },
          { status: 500 }
        );
      }

      profilesById = Object.fromEntries(
        (profilesData || []).map((profile) => [profile.id, profile])
      );
    }

    const mergedRewards = rewards.map((reward) => ({
      ...reward,
      profiles: profilesById[reward.user_id] || null,
    }));

    return NextResponse.json({
      rewards: mergedRewards,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load leadership rewards." },
      { status: 500 }
    );
  }
}