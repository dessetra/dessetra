import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RewardChoice = "cash_gift" | "item_reward";

export async function POST(request: Request) {
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
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const { userRankId, rewardChoice } = await request.json();

    if (!userRankId) {
      return NextResponse.json(
        { error: "Missing userRankId." },
        { status: 400 }
      );
    }

    if (!["cash_gift", "item_reward"].includes(rewardChoice)) {
      return NextResponse.json(
        { error: "Invalid reward choice." },
        { status: 400 }
      );
    }

    const cleanRewardChoice = rewardChoice as RewardChoice;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: userRankData, error: userRankError } = await adminClient
      .from("leadership_user_ranks")
      .select("id, user_id, reward_status, reward_choice")
      .eq("id", userRankId)
      .maybeSingle();

    if (userRankError) {
      return NextResponse.json(
        { error: userRankError.message },
        { status: 500 }
      );
    }

    if (!userRankData) {
      return NextResponse.json(
        { error: "Leadership reward not found." },
        { status: 404 }
      );
    }

    if (userRankData.user_id !== user.id) {
      return NextResponse.json(
        { error: "You cannot select this reward." },
        { status: 403 }
      );
    }

    if (userRankData.reward_status !== "eligible") {
      return NextResponse.json(
        { error: "This reward is not available for selection." },
        { status: 400 }
      );
    }

    const { error: updateError } = await adminClient
      .from("leadership_user_ranks")
      .update({
        reward_choice: cleanRewardChoice,
        reward_status: "selected",
        reward_selected_at: new Date().toISOString(),
      })
      .eq("id", userRankId)
      .eq("user_id", user.id)
      .eq("reward_status", "eligible");

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Reward choice submitted successfully.",
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to submit reward choice." },
      { status: 500 }
    );
  }
}