"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestSupabasePage() {
  const [message, setMessage] = useState("Testing...");

  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setMessage(`Error: ${error.message}`);
        return;
      }

      setMessage(`Connected successfully. Session: ${data.session ? "Yes" : "No"}`);
    }

    testConnection();
  }, []);

  return (
    <main style={{ padding: 30 }}>
      <h1>Supabase Connection Test</h1>
      <p>{message}</p>
    </main>
  );
}