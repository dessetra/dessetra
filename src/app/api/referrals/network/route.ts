import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ReferralRow = {
  referred_user_id: string;
};

type ReferralProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json(
        { error: "Referral server configuration is incomplete." },
        { status: 500 }
      );
    }

    const authClient = createClient(supabaseUrl, anonKey, {
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
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: firstRows, error: firstRowsError } = await adminClient
      .from("referrals")
      .select("referred_user_id")
      .eq("referrer_id", user.id);

    if (firstRowsError) {
      return NextResponse.json(
        { error: firstRowsError.message },
        { status: 500 }
      );
    }

    const firstIds = Array.from(
      new Set((firstRows as ReferralRow[] | null)?.map((row) => row.referred_user_id) || [])
    );

    let firstGeneration: ReferralProfile[] = [];
    let secondGeneration: ReferralProfile[] = [];

    if (firstIds.length > 0) {
      const { data: firstProfiles, error: firstProfilesError } =
        await adminClient
          .from("profiles")
          .select("id, full_name, email")
          .in("id", firstIds);

      if (firstProfilesError) {
        return NextResponse.json(
          { error: firstProfilesError.message },
          { status: 500 }
        );
      }

      firstGeneration = (firstProfiles || []) as ReferralProfile[];

      const { data: secondRows, error: secondRowsError } = await adminClient
        .from("referrals")
        .select("referred_user_id")
        .in("referrer_id", firstIds);

      if (secondRowsError) {
        return NextResponse.json(
          { error: secondRowsError.message },
          { status: 500 }
        );
      }

      const secondIds = Array.from(
        new Set(
          (secondRows as ReferralRow[] | null)?.map((row) => row.referred_user_id) || []
        )
      );

      if (secondIds.length > 0) {
        const { data: secondProfiles, error: secondProfilesError } =
          await adminClient
            .from("profiles")
            .select("id, full_name, email")
            .in("id", secondIds);

        if (secondProfilesError) {
          return NextResponse.json(
            { error: secondProfilesError.message },
            { status: 500 }
          );
        }

        secondGeneration = (secondProfiles || []) as ReferralProfile[];
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
      { error: "Unable to load referral network." },
      { status: 500 }
    );
  }
}