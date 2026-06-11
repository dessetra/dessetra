import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MINIMUM_WITHDRAWAL = 20;
const WITHDRAWAL_CURRENCY = "USDT_BEP20";
const WITHDRAWAL_NETWORK = "BEP20";

type WalletTransaction = {
  amount_usd: number | string;
  direction: string;
  status: string;
};

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const { amount, walletAddress } = await request.json();

    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized withdrawal request." },
        { status: 401 }
      );
    }

    if (!amount || !walletAddress) {
      return NextResponse.json(
        { error: "Missing withdrawal details." },
        { status: 400 }
      );
    }

    const withdrawalAmount = Number(amount);

    if (Number.isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid withdrawal amount." },
        { status: 400 }
      );
    }

    if (withdrawalAmount < MINIMUM_WITHDRAWAL) {
      return NextResponse.json(
        { error: "Minimum withdrawal amount is $20." },
        { status: 400 }
      );
    }

    const cleanWalletAddress = String(walletAddress).trim();

    if (cleanWalletAddress.length < 20) {
      return NextResponse.json(
        { error: "Please enter a valid USDT BEP20 wallet address." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server withdrawal configuration is incomplete." },
        { status: 500 }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized withdrawal request." },
        { status: 401 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: walletRowsData, error: walletError } = await supabaseAdmin
      .from("wallet_transactions")
      .select("amount_usd, direction, status")
      .eq("user_id", user.id);

    if (walletError) {
      return NextResponse.json(
        { error: walletError.message },
        { status: 500 }
      );
    }

    const walletRows = (walletRowsData || []) as WalletTransaction[];

    const availableBalance = walletRows.reduce((sum, row) => {
      const amountUsd = Number(row.amount_usd || 0);

      if (row.direction === "credit" && row.status === "completed") {
        return sum + amountUsd;
      }

      if (
        row.direction === "debit" &&
        (row.status === "pending" || row.status === "completed")
      ) {
        return sum - amountUsd;
      }

      return sum;
    }, 0);

    if (withdrawalAmount > availableBalance) {
      return NextResponse.json(
        { error: "Insufficient wallet balance." },
        { status: 400 }
      );
    }

    const { data: withdrawal, error: withdrawalError } = await supabaseAdmin
      .from("withdrawal_requests")
      .insert({
        user_id: user.id,
        amount: withdrawalAmount,
        currency: WITHDRAWAL_CURRENCY,
        network: WITHDRAWAL_NETWORK,
        wallet_address: cleanWalletAddress,
        status: "pending",
        requested_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (withdrawalError || !withdrawal) {
      return NextResponse.json(
        {
          error:
            withdrawalError?.message || "Unable to create withdrawal request.",
        },
        { status: 500 }
      );
    }

    const { data: walletTransaction, error: transactionError } =
      await supabaseAdmin
        .from("wallet_transactions")
        .insert({
          user_id: user.id,
          transaction_type: "withdrawal",
          amount_usd: withdrawalAmount,
          currency: WITHDRAWAL_CURRENCY,
          direction: "debit",
          status: "pending",
          description: "Withdrawal request pending admin approval",
          reference_table: "withdrawal_requests",
          reference_id: withdrawal.id,
        })
        .select("id")
        .single();

    if (transactionError || !walletTransaction) {
      await supabaseAdmin
        .from("withdrawal_requests")
        .delete()
        .eq("id", withdrawal.id);

      return NextResponse.json(
        {
          error:
            transactionError?.message ||
            "Unable to create wallet transaction for withdrawal.",
        },
        { status: 500 }
      );
    }

    await supabaseAdmin
      .from("withdrawal_requests")
      .update({
        wallet_transaction_id: walletTransaction.id,
      })
      .eq("id", withdrawal.id);

    return NextResponse.json({
      success: true,
      withdrawalId: withdrawal.id,
      message: "Withdrawal request submitted successfully.",
    });
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error while requesting withdrawal." },
      { status: 500 }
    );
  }
}