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

  return adminClient;
}

export async function GET(request: Request) {
  try {
    const adminClient = await verifyFounder(request);

    if (!adminClient) {
      return NextResponse.json(
        { error: "Founder access required." },
        { status: 403 }
      );
    }

    const { data: investments, error } = await adminClient
      .from("investments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const userIds = [...new Set((investments || []).map(i => i.user_id))];

    const { data: profiles } =
      userIds.length > 0
        ? await adminClient
            .from("profiles")
            .select("id, full_name, email, country")
            .in("id", userIds)
        : { data: [] };

    const investors = (investments || []).map((investment) => {
      const profile = (profiles || []).find(
        (p) => p.id === investment.user_id
      );

      const progress =
        Number(investment.target_return_usd || 0) > 0
          ? (
              (Number(investment.current_earnings_usd || 0) /
                Number(investment.target_return_usd)) *
              100
            ).toFixed(2)
          : "0";

      return {
        ...investment,
        progress_percentage: progress,
        user: profile || null,
      };
    });

    return NextResponse.json({
      investors,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Unable to load investors.",
      },
      {
        status: 500,
      }
    );
  }
}