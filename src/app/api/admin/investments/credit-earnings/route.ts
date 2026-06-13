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

    const { investmentId, amountUsd, weekStart, weekEnd } =
      await request.json();

    const amount = Number(amountUsd);

    if (!investmentId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid earnings amount." },
        { status: 400 }
      );
    }

    const { data: investment } = await adminClient
      .from("investments")
      .select("*")
      .eq("id", investmentId)
      .maybeSingle();

    if (!investment) {
      return NextResponse.json(
        { error: "Investment not found." },
        { status: 404 }
      );
    }

    if (investment.status === "completed") {
      return NextResponse.json(
        { error: "Investment already completed." },
        { status: 400 }
      );
    }

    if (investment.status !== "active") {
      return NextResponse.json(
        { error: "Only active investments can receive earnings." },
        { status: 400 }
      );
    }

    const targetReturn = Number(investment.target_return_usd || 0);
    const currentEarnings = Number(investment.current_earnings_usd || 0);
    const availableWithdrawal = Number(
      investment.available_withdrawal_usd || 0
    );

    const remainingTarget = Math.max(targetReturn - currentEarnings, 0);
    const finalCreditAmount = Math.min(amount, remainingTarget);

    if (finalCreditAmount <= 0) {
      return NextResponse.json(
        { error: "Investment has already reached its target return." },
        { status: 400 }
      );
    }

    const newCurrent = currentEarnings + finalCreditAmount;
    const newAvailable = availableWithdrawal + finalCreditAmount;

    let newStatus = investment.status;
    let completedAt = investment.completed_at;

    if (newCurrent >= targetReturn) {
      newStatus = "completed";
      completedAt = new Date().toISOString();
    }

    const { data: earningsRecord, error: historyError } = await adminClient
      .from("investment_earnings")
      .insert({
        investment_id: investment.id,
        user_id: investment.user_id,
        amount_usd: finalCreditAmount,
        week_start: weekStart || null,
        week_end: weekEnd || null,
        admin_id: founderId,
        week_label:
          weekStart && weekEnd ? `${weekStart} to ${weekEnd}` : "Earnings update",
        admin_note:
          finalCreditAmount < amount
            ? `Requested credit was ${amount}, but only ${finalCreditAmount} was credited because the investment reached its target return.`
            : null,
      })
      .select("id")
      .single();

    if (historyError || !earningsRecord) {
      return NextResponse.json(
        { error: historyError?.message || "Unable to record earnings." },
        { status: 500 }
      );
    }

    const { error: updateError } = await adminClient
      .from("investments")
      .update({
        current_earnings_usd: newCurrent,
        available_withdrawal_usd: newAvailable,
        status: newStatus,
        completed_at: completedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", investment.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    const { error: walletError } = await adminClient
      .from("wallet_transactions")
      .insert({
        user_id: investment.user_id,
        transaction_type: "investor_weekly_earning",
        amount_usd: finalCreditAmount,
        currency: "USDT_BEP20",
        direction: "credit",
        status: "completed",
        description: "Weekly investor earnings credited by Founder",
        reference_table: "investment_earnings",
        reference_id: earningsRecord.id,
      });

    if (walletError) {
      return NextResponse.json(
        { error: walletError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      credited_amount_usd: finalCreditAmount,
      requested_amount_usd: amount,
      current_earnings_usd: newCurrent,
      available_withdrawal_usd: newAvailable,
      status: newStatus,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to credit investor earnings." },
      { status: 500 }
    );
  }
}