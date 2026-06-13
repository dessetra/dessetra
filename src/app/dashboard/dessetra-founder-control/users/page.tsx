"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import AdminGuard from "@/components/admin/AdminGuard";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type FounderUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  country: string | null;
  whatsapp_number: string | null;
  date_of_birth: string | null;
  wallet_address: string | null;
  referral_code: string | null;
  created_at: string;
  referral_count: number;
  premium_status: string;
  premium_plan: string;
  investor_status: string;
  investment_tier: number | string | null;
};

export default function FounderUsersPage() {
  const [users, setUsers] = useState<FounderUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");

  async function loadUsers() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/users", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      toast.error(result.error || "Unable to load users.");
      setLoading(false);
      return;
    }

    setUsers(result.users || []);
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadUsers();
    });
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchable = `${user.full_name || ""} ${user.email || ""} ${
        user.country || ""
      } ${user.referral_code || ""}`.toLowerCase();

      const matchesSearch = searchable.includes(searchTerm.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "free" && user.premium_status === "free") ||
        (filter === "premium" && user.premium_status === "active") ||
        (filter === "investors" && user.investor_status === "active");

      return matchesSearch && matchesFilter;
    });
  }, [users, searchTerm, filter]);

  const formatDate = (value: string | null) => {
    if (!value) return "Not provided";

    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatMoney = (value: number | string | null) => {
    if (!value) return "None";

    return `$${Number(value || 0).toLocaleString()}`;
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="rounded-3xl bg-gradient-to-r from-[#04122D] to-[#0D2A5E] p-6 text-white shadow-lg md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
            Founder Control
          </p>

          <h1 className="mt-3 text-3xl font-bold md:text-4xl">
            User Management
          </h1>

          <p className="mt-3 max-w-3xl text-gray-300">
            View registered users, premium status, referral counts, investor
            status, country, date of birth, and wallet information.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {["all", "free", "premium", "investors"].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-xl px-4 py-3 font-semibold capitalize ${
                filter === item
                  ? "bg-[#D4AF37] text-[#071A3D]"
                  : "bg-[#0D2A5E] text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-white p-5 text-[#071A3D] shadow-lg">
          <input
            type="text"
            placeholder="Search by name, email, country, or referral code..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3 outline-none"
          />
        </div>

        <div className="mt-6 rounded-2xl bg-[#0D2A5E] p-6 text-white shadow-lg">
          <h2 className="text-2xl font-bold">Registered Users</h2>

          {loading ? (
            <div className="mt-6 rounded-xl bg-white p-6 text-[#071A3D]">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-gray-500 p-10 text-center text-gray-400">
              No users found.
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="rounded-2xl bg-white p-5 text-[#071A3D] shadow"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <h3 className="text-xl font-bold">
                        {user.full_name || "Unnamed User"}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {user.email || "No email"} •{" "}
                        {user.country || "Unknown country"}
                      </p>

                      <p className="mt-2 text-sm text-gray-500">
                        Registered: {formatDate(user.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-4 py-2 text-sm font-bold ${
                          user.premium_status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {user.premium_status === "active"
                          ? user.premium_plan
                          : "Free User"}
                      </span>

                      {user.investor_status === "active" && (
                        <span className="rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-bold text-[#071A3D]">
                          Investor
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-4">
                    <div className="rounded-xl bg-gray-100 p-4">
                      <p className="text-sm text-gray-500">Referrals</p>
                      <p className="mt-1 font-bold">
                        {user.referral_count}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-100 p-4">
                      <p className="text-sm text-gray-500">Referral Code</p>
                      <p className="mt-1 break-all font-bold">
                        {user.referral_code || "None"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-100 p-4">
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="mt-1 font-bold">
                        {formatDate(user.date_of_birth)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-100 p-4">
                      <p className="text-sm text-gray-500">Investment Tier</p>
                      <p className="mt-1 font-bold">
                        {formatMoney(user.investment_tier)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl bg-gray-100 p-4">
                      <p className="text-sm text-gray-500">WhatsApp</p>
                      <p className="mt-1 break-all font-bold">
                        {user.whatsapp_number || "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-100 p-4">
                      <p className="text-sm text-gray-500">
                        USDT BEP20 Wallet
                      </p>
                      <p className="mt-1 break-all font-mono text-sm">
                        {user.wallet_address || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}