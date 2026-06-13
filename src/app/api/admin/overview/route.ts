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

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) return null;

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  const { data: adminUser } = await supabaseAdmin
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "founder")
    .maybeSingle();

  if (!adminUser) return null;

  return supabaseAdmin;
}

export async function GET(request: Request) {
  try {
    const supabase = await verifyFounder(request);

    if (!supabase) {
      return NextResponse.json(
        { error: "Founder access required." },
        { status: 403 }
      );
    }

    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: premiumUsers } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    const { count: totalInvestors } = await supabase
      .from("investments")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    const { count: pendingWithdrawals } = await supabase
      .from("withdrawal_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("amount_usd")
      .eq("status", "active");

    const { data: investments } = await supabase
      .from("investments")
      .select("tier_amount_usd")
      .eq("status", "active");

    const subscriptionRevenue = (subscriptions || []).reduce(
      (sum, item) => sum + Number(item.amount_usd || 0),
      0
    );

    const investmentRevenue = (investments || []).reduce(
      (sum, item) => sum + Number(item.tier_amount_usd || 0),
      0
    );

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      premiumUsers: premiumUsers || 0,
      freeUsers: Math.max((totalUsers || 0) - (premiumUsers || 0), 0),
      totalInvestors: totalInvestors || 0,
      pendingWithdrawals: pendingWithdrawals || 0,
      subscriptionRevenue,
      investmentRevenue,
      totalRevenue: subscriptionRevenue + investmentRevenue,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load founder overview." },
      { status: 500 }
    );
  }
}