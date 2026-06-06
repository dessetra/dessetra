"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

export default function LearnPage() {
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReferralCount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { count, error } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user.id);

      if (!error) {
        setReferralCount(count || 0);
      }

      setLoading(false);
    }

    loadReferralCount();
  }, []);

  const module2Unlocked = referralCount >= 5;

  const modules = [
    {
      title: "Module 1",
      name: "The Awakening",
      progress: "Available",
      href: "/dashboard/learn/stage-1",
      locked: false,
      button: "Open Module",
    },
    {
      title: "Module 2",
      name: "Safe Participation",
      progress: module2Unlocked
        ? "Unlocked"
        : `${referralCount}/5 referrals completed`,
      href: module2Unlocked ? "/dashboard/learn/stage-2" : "#",
      locked: !module2Unlocked,
      button: module2Unlocked ? "Open Module" : "Locked",
    },
    {
      title: "Module 3",
      name: "DeFi & Passive Income",
      progress: "Premium access pending",
      href: "/dashboard/learn/stage-3",
      locked: false,
      button: "Open Module",
    },
    {
      title: "Module 4",
      name: "Evaluating Web3 Opportunities",
      progress: "Premium access pending",
      href: "/dashboard/learn/stage-4",
      locked: false,
      button: "Open Module",
    },
    {
      title: "Module 5",
      name: "Long-Term Web3 Success",
      progress: "Premium access pending",
      href: "/dashboard/learn/stage-5",
      locked: false,
      button: "Open Module",
    },
  ];

  return (
    <DashboardLayout>
      <div className="rounded-2xl bg-[#0D2A5E] p-5 shadow-lg md:p-6">
        <h1 className="text-2xl font-bold md:text-3xl">Learning Center</h1>

        <p className="mt-2 text-sm text-gray-300 md:text-base">
          Progress through the Dessetra Academy and unlock new opportunities as
          you learn.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {modules.map((module) => (
          <div
            key={module.title}
            className="rounded-2xl bg-[#0D2A5E] p-6 shadow-lg"
          >
            <p className="text-sm text-[#D4AF37]">{module.title}</p>

            <h2 className="mt-2 text-xl font-semibold">{module.name}</h2>

            <p className="mt-4 text-sm text-gray-300">
              {loading && module.title === "Module 2"
                ? "Checking referral unlock status..."
                : module.progress}
            </p>

            <a
              href={module.href}
              onClick={(e) => {
                if (module.locked) {
                  e.preventDefault();
                }
              }}
              className={
                module.locked
                  ? "mt-5 inline-block cursor-not-allowed rounded-lg bg-gray-600 px-5 py-2 font-semibold text-white"
                  : "mt-5 inline-block rounded-lg bg-[#D4AF37] px-5 py-2 font-semibold text-[#071A3D]"
              }
            >
              {loading && module.title === "Module 2"
                ? "Checking..."
                : module.button}
            </a>

            {module.title === "Module 2" && !module2Unlocked && !loading && (
              <p className="mt-3 text-xs text-gray-400">
                Refer 5 users to unlock Module 2.
              </p>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}