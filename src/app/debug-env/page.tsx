export default function DebugEnvPage() {
  return (
    <main style={{ padding: 30 }}>
      <h1>Environment Check</h1>

      <p>
        Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || "Missing"}
      </p>

      <p>
        Supabase Key Loaded:{" "}
        {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Yes" : "No"}
      </p>
    </main>
  );
}