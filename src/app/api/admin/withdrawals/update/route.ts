import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import {
  buildWithdrawalApprovedEmail,
  buildWithdrawalRejectedEmail,
} from "@/lib/withdrawalEmail";

type DatabaseClient = {
  from: ReturnType<typeof createClient>["from"];
};
type WithdrawalStatus = "approved" | "rejected";

type WithdrawalRecord = {
  id: string;
  user_id: string;
  amount: number | string;
  currency: string | null;
  network: string | null;
  wallet_address: string;
  status: string;
};

type ProfileRecord = {
  full_name: string | null;
  email: string | null;
};

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

async function sendWithdrawalStatusEmail({
  adminClient,
  withdrawal,
  status,
  adminNote,
  txHash,
}: {
  adminClient: DatabaseClient;
  withdrawal: WithdrawalRecord;
  status: WithdrawalStatus;
  adminNote: string;
  txHash: string;
}) {
  const { data: profileData } = await adminClient
    .from("profiles")
    .select("full_name, email")
    .eq("id", withdrawal.user_id)
    .maybeSingle();

  const profile = profileData as ProfileRecord | null;

  if (!profile?.email) return;

  const emailContent =
    status === "approved"
      ? buildWithdrawalApprovedEmail({
          fullName: profile.full_name || "Dessetra Member",
          amount: Number(withdrawal.amount || 0),
          currency: withdrawal.currency || "USDT_BEP20",
          network: withdrawal.network || "BEP20",
          walletAddress: withdrawal.wallet_address,
          txHash,
          adminNote,
        })
      : buildWithdrawalRejectedEmail({
          fullName: profile.full_name || "Dessetra Member",
          amount: Number(withdrawal.amount || 0),
          currency: withdrawal.currency || "USDT_BEP20",
          network: withdrawal.network || "BEP20",
          walletAddress: withdrawal.wallet_address,
          adminNote,
        });

  await sendEmail({
    to: profile.email,
    subject: emailContent.subject,
    html: emailContent.html,
  });
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

    const { withdrawalId, status, adminNote, txHash } = await request.json();

    if (!withdrawalId) {
      return NextResponse.json(
        { error: "Missing withdrawalId." },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const cleanStatus = status as WithdrawalStatus;
    const cleanAdminNote = String(adminNote || "").trim();
    const cleanTxHash = String(txHash || "").trim();

    if (cleanStatus === "approved" && !cleanTxHash) {
      return NextResponse.json(
        { error: "Transaction hash is required before approving withdrawal." },
        { status: 400 }
      );
    }

    const { data: withdrawalData } = await adminClient
      .from("withdrawal_requests")
      .select("*")
      .eq("id", withdrawalId)
      .maybeSingle();

    const withdrawal = withdrawalData as WithdrawalRecord | null;

    if (!withdrawal) {
      return NextResponse.json(
        { error: "Withdrawal not found." },
        { status: 404 }
      );
    }

    if (withdrawal.status !== "pending") {
      return NextResponse.json(
        { error: "This withdrawal has already been processed." },
        { status: 400 }
      );
    }

    const { error: withdrawalUpdateError } = await adminClient
      .from("withdrawal_requests")
      .update({
        status: cleanStatus,
        admin_note: cleanAdminNote || null,
        tx_hash: cleanStatus === "approved" ? cleanTxHash : null,
        admin_id: founderId,
        processed_at: new Date().toISOString(),
      })
      .eq("id", withdrawalId);

    if (withdrawalUpdateError) {
      return NextResponse.json(
        { error: withdrawalUpdateError.message },
        { status: 500 }
      );
    }

    const walletStatus =
      cleanStatus === "approved" ? "completed" : "cancelled";

    const { error: walletUpdateError } = await adminClient
      .from("wallet_transactions")
      .update({
        status: walletStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("reference_table", "withdrawal_requests")
      .eq("reference_id", withdrawalId)
      .eq("transaction_type", "withdrawal")
      .eq("direction", "debit");

    if (walletUpdateError) {
      return NextResponse.json(
        { error: walletUpdateError.message },
        { status: 500 }
      );
    }

    try {
      await sendWithdrawalStatusEmail({
        adminClient,
        withdrawal,
        status: cleanStatus,
        adminNote: cleanAdminNote,
        txHash: cleanTxHash,
      });
    } catch (emailError) {
      console.log("Withdrawal email failed:", emailError);
    }

    return NextResponse.json({
      success: true,
      message:
        cleanStatus === "approved"
          ? "Withdrawal approved successfully."
          : "Withdrawal rejected successfully.",
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to update withdrawal." },
      { status: 500 }
    );
  }
}