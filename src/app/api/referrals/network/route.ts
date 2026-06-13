import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
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

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceKey
    );

    const { data: firstRows } = await adminClient
      .from("referrals")
      .select("referred_user_id")
      .eq("referrer_id", user.id);

    const firstIds =
      firstRows?.map((r) => r.referred_user_id) || [];

    let firstGeneration: any[] = [];
    let secondGeneration: any[] = [];

    if (firstIds.length > 0) {
      const { data: firstProfiles } = await adminClient
        .from("profiles")
        .select("id,full_name,email")
        .in("id", firstIds);

      firstGeneration = firstProfiles || [];

      const { data: secondRows } = await adminClient
        .from("referrals")
        .select("referred_user_id")
        .in("referrer_id", firstIds);

      const secondIds =
        secondRows?.map((r) => r.referred_user_id) || [];

      if (secondIds.length > 0) {
        const { data: secondProfiles } =
          await adminClient
            .from("profiles")
            .select("id,full_name,email")
            .in("id", secondIds);

        secondGeneration = secondProfiles || [];
      }
    }

    return NextResponse.json({
      firstGeneration,
      secondGeneration,
      firstCount: firstGeneration.length,
      secondCount: secondGeneration.length,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Unable to load referral network.",
      },
      {
        status: 500,
      }
    );
  }
}