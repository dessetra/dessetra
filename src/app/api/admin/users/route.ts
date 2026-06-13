import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function verifyFounder(request: Request) {
  const authHeader = request.headers.get("authorization") || "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const authClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) return null;

  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: founder } = await adminClient
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "founder")
    .maybeSingle();

  if (!founder) return null;

  return adminClient;
}

export async function GET(request: Request) {
  try {
    const adminClient = await verifyFounder(request);

    if (!adminClient) {
      return NextResponse.json(
        { error: "Founder access required." },
        { status: 403 }
      );
    }

    const { data: profiles, error: profileError } = await adminClient
      .from("profiles")
      .select(
        "id, full_name, email, country, whatsapp_number, date_of_birth, wallet_address, referral_code, created_at"
      )
      .order("created_at", { ascending: false });

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    const { data: referrals } = await adminClient
      .from("referrals")
      .select("referrer_id, referred_user_id");

    const { data: subscriptions } = await adminClient
      .from("subscriptions")
      .select("user_id, plan_key, plan_name, status, expires_at, created_at")
      .order("created_at", { ascending: false });

    const { data: investments } = await adminClient
      .from("investments")
      .select("user_id, tier_amount_usd, status, created_at")
      .order("created_at", { ascending: false });

    const users = (profiles || []).map((profile) => {
      const referralCount = (referrals || []).filter(
        (referral) => referral.referrer_id === profile.id
      ).length;

      const latestSubscription = (subscriptions || []).find(
        (subscription) => subscription.user_id === profile.id
      );

      const activeSubscription = (subscriptions || []).find(
        (subscription) =>
          subscription.user_id === profile.id &&
          subscription.status === "active" &&
          (!subscription.expires_at ||
            new Date(subscription.expires_at).getTime() > Date.now())
      );

      const userInvestments = (investments || []).filter(
        (investment) => investment.user_id === profile.id
      );

      const activeInvestment = userInvestments.find(
        (investment) => investment.status === "active"
      );

      return {
        ...profile,
        referral_count: referralCount,
        premium_status: activeSubscription ? "active" : "free",
        premium_plan:
          activeSubscription?.plan_name ||
          latestSubscription?.plan_name ||
          "Free",
        investor_status: activeInvestment ? "active" : "none",
        investment_tier: activeInvestment?.tier_amount_usd || null,
      };
    });

    return NextResponse.json({
      users,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load users." },
      { status: 500 }
    );
  }
}