import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function verifyFounder(request: Request) {
  const authHeader = request.headers.get("authorization") || "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return null;
  }

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

  return { supabaseAdmin, founderId: user.id };
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

    const { supabaseAdmin } = verified;

    const { data, error } = await supabaseAdmin
      .from("withdrawal_requests")
      .select(
        "id, user_id, amount, currency, network, wallet_address, status, admin_note, requested_at, processed_at, wallet_transaction_id, admin_id, tx_hash"
      )
      .order("requested_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = [...new Set((data || []).map((item) => item.user_id))];

    const { data: profiles } =
      userIds.length > 0
        ? await supabaseAdmin
            .from("profiles")
            .select("id, full_name, email, country")
            .in("id", userIds)
        : { data: [] };

    const enrichedWithdrawals = (data || []).map((withdrawal) => {
      const profile = (profiles || []).find(
        (item) => item.id === withdrawal.user_id
      );

      return {
        ...withdrawal,
        user: profile || null,
      };
    });

    return NextResponse.json({
      withdrawals: enrichedWithdrawals,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load withdrawal requests." },
      { status: 500 }
    );
  }
}