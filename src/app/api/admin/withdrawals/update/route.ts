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

  const { data: admin } = await adminClient
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "founder")
    .maybeSingle();

  if (!admin) return null;

  return {
    adminClient,
    founderId: user.id,
  };
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

    const {
      withdrawalId,
      status,
      adminNote,
      txHash,
    } = await request.json();

    if (!withdrawalId) {
      return NextResponse.json(
        { error: "Missing withdrawalId." },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status." },
        { status: 400 }
      );
    }

    const { data: withdrawal } = await adminClient
      .from("withdrawal_requests")
      .select("*")
      .eq("id", withdrawalId)
      .maybeSingle();

    if (!withdrawal) {
      return NextResponse.json(
        { error: "Withdrawal not found." },
        { status: 404 }
      );
    }

    if (withdrawal.status !== "pending") {
      return NextResponse.json(
        {
          error: "This withdrawal has already been processed.",
        },
        { status: 400 }
      );
    }

    const { error } = await adminClient
      .from("withdrawal_requests")
      .update({
        status,
        admin_note: adminNote || null,
        tx_hash: txHash || null,
        admin_id: founderId,
        processed_at: new Date().toISOString(),
      })
      .eq("id", withdrawalId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Unable to update withdrawal.",
      },
      {
        status: 500,
      }
    );
  }
}