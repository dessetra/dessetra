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

    const { data: subscriptions, error } = await adminClient
      .from("subscriptions")
      .select(
        "id, user_id, plan_key, plan_name, billing_cycle, amount_usd, status, payment_status, nowpayments_payment_id, pay_currency, pay_amount, started_at, expires_at, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const userIds = [
      ...new Set((subscriptions || []).map((subscription) => subscription.user_id)),
    ];

    const { data: profiles } =
      userIds.length > 0
        ? await adminClient
            .from("profiles")
            .select("id, full_name, email, country, created_at")
            .in("id", userIds)
        : { data: [] };

    const enrichedSubscriptions = (subscriptions || []).map((subscription) => {
      const profile = (profiles || []).find(
        (item) => item.id === subscription.user_id
      );

      const isExpired =
        subscription.expires_at &&
        new Date(subscription.expires_at).getTime() < Date.now();

      return {
        ...subscription,
        computed_status:
          subscription.status === "active" && isExpired
            ? "expired"
            : subscription.status,
        user: profile || null,
      };
    });

    return NextResponse.json({
      subscriptions: enrichedSubscriptions,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load subscriptions." },
      { status: 500 }
    );
  }
}