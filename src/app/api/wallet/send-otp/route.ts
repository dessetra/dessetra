import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { buildOtpEmail } from "@/lib/otpEmail";

type OtpPurpose = "wallet_save" | "withdrawal";

type ProfileRecord = {
  full_name: string | null;
  email: string | null;
};

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized request." }, { status: 401 });
    }

    const { purpose, walletAddress, amount } = await request.json();

    if (!["wallet_save", "withdrawal"].includes(purpose)) {
      return NextResponse.json({ error: "Invalid OTP purpose." }, { status: 400 });
    }

    const cleanPurpose = purpose as OtpPurpose;
    const cleanWalletAddress = String(walletAddress || "").trim();
    const withdrawalAmount = amount ? Number(amount) : null;

    if (cleanPurpose === "wallet_save" && cleanWalletAddress.length < 20) {
      return NextResponse.json(
        { error: "Please enter a valid USDT BEP20 wallet address." },
        { status: 400 }
      );
    }

    if (
      cleanPurpose === "withdrawal" &&
      (!withdrawalAmount || Number.isNaN(withdrawalAmount) || withdrawalAmount <= 0)
    ) {
      return NextResponse.json(
        { error: "Please enter a valid withdrawal amount." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server OTP configuration is incomplete." },
        { status: 500 }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
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
      return NextResponse.json({ error: "Unauthorized request." }, { status: 401 });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profileData } = await adminClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    const profile = profileData as ProfileRecord | null;

    if (!profile?.email) {
      return NextResponse.json(
        { error: "No email address found for this account." },
        { status: 400 }
      );
    }

    await adminClient
      .from("wallet_verifications")
      .delete()
      .eq("user_id", user.id)
      .eq("purpose", cleanPurpose)
      .eq("verified", false);

    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await adminClient
      .from("wallet_verifications")
      .insert({
        user_id: user.id,
        purpose: cleanPurpose,
        wallet_address: cleanPurpose === "wallet_save" ? cleanWalletAddress : null,
        amount: cleanPurpose === "withdrawal" ? withdrawalAmount : null,
        otp_code: otpCode,
        verified: false,
        expires_at: expiresAt,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const email = buildOtpEmail({
      fullName: profile.full_name || "Dessetra Member",
      otpCode,
      purpose: cleanPurpose,
    });

    await sendEmail({
      to: profile.email,
      subject: email.subject,
      html: email.html,
    });

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email.",
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to send verification code." },
      { status: 500 }
    );
  }
}