import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type VerificationRecord = {
  id: string;
  user_id: string;
  purpose: "wallet_save" | "withdrawal";
  wallet_address: string | null;
  amount: number | null;
  otp_code: string;
  verified: boolean;
  expires_at: string;
};

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized request." },
        { status: 401 }
      );
    }

    const { otpCode, purpose } = await request.json();

    if (!otpCode || !purpose) {
      return NextResponse.json(
        { error: "Missing verification details." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server verification configuration is incomplete." },
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
      return NextResponse.json(
        { error: "Unauthorized request." },
        { status: 401 }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: verificationData } = await adminClient
      .from("wallet_verifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("purpose", purpose)
      .eq("verified", false)
      .eq("otp_code", String(otpCode).trim())
      .maybeSingle();

    const verification =
      verificationData as VerificationRecord | null;

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 400 }
      );
    }

    if (new Date(verification.expires_at) < new Date()) {
      await adminClient
        .from("wallet_verifications")
        .delete()
        .eq("id", verification.id);

      return NextResponse.json(
        { error: "Verification code has expired." },
        { status: 400 }
      );
    }

    const { error: updateError } = await adminClient
      .from("wallet_verifications")
      .update({
        verified: true,
      })
      .eq("id", verification.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      purpose: verification.purpose,
      walletAddress: verification.wallet_address,
      amount: verification.amount,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to verify code." },
      { status: 500 }
    );
  }
}