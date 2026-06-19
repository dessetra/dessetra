import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type VerificationRecord = {
  id: string;
  user_id: string;
  purpose: "wallet_save" | "withdrawal";
  wallet_address: string | null;
  verified: boolean;
  expires_at: string;
};

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized wallet save request." },
        { status: 401 }
      );
    }

    const { otpCode } = await request.json();

    if (!otpCode) {
      return NextResponse.json(
        { error: "Verification code is required." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server wallet save configuration is incomplete." },
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
        { error: "Unauthorized wallet save request." },
        { status: 401 }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: verificationData } = await adminClient
      .from("wallet_verifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("purpose", "wallet_save")
      .eq("verified", false)
      .eq("otp_code", String(otpCode).trim())
      .maybeSingle();

    const verification = verificationData as VerificationRecord | null;

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

    if (!verification.wallet_address || verification.wallet_address.length < 20) {
      return NextResponse.json(
        { error: "Verified wallet address is invalid." },
        { status: 400 }
      );
    }

    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({
        wallet_address: verification.wallet_address,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileUpdateError) {
      return NextResponse.json(
        { error: profileUpdateError.message },
        { status: 500 }
      );
    }

    await adminClient
      .from("wallet_verifications")
      .update({
        verified: true,
      })
      .eq("id", verification.id);

    await adminClient
      .from("wallet_verifications")
      .delete()
      .eq("user_id", user.id)
      .eq("purpose", "wallet_save")
      .eq("verified", false);

    return NextResponse.json({
      success: true,
      walletAddress: verification.wallet_address,
      message: "Wallet address verified and saved successfully.",
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to save verified wallet address." },
      { status: 500 }
    );
  }
}