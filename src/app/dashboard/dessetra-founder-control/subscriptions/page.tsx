"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import AdminGuard from "@/components/admin/AdminGuard";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type SubscriptionUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  country: string | null;
  created_at: string | null;
};

type Subscription = {
  id: string;
  user_id: string;
  plan_key: string;
  plan_name: string;
  billing_cycle: string;
  amount_usd: number | string;
  status: string;
  computed_status: string;
  payment_status: string | null;
  nowpayments_payment_id: string | null;
  pay_currency: string | null;
  pay_amount: number | string | null;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string | null;
  user: SubscriptionUser | null;
};

export default function FounderSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");

  async function loadSubscriptions() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/subscriptions", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      toast.error(result.error || "Unable to load subscriptions.");
      setLoading(false);
      return;
    }

    setSubscriptions(result.subscriptions || []);
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadSubscriptions();
    });
  }, []);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((subscription) => {
      const matchesStatus =
        statusFilter === "all" ||
        subscription.computed_status === statusFilter ||
        subscription.status === statusFilter;

      const searchable = `${subscription.user?.full_name || ""} ${
        subscription.user?.email || ""
      } ${subscription.user?.country || ""} ${
        subscription.plan_name || ""
      } ${subscription.plan_key || ""}`.toLowerCase();

      return matchesStatus && searchable.includes(searchTerm.toLowerCase());
    });
  }, [subscriptions, statusFilter, searchTerm]);

  const formatMoney = (value: number | string | null) => {
    return `$${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (value: string | null) => {
    if (!value) return "Not set";

    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatBillingCycle = (cycle: string) => {
    return cycle === "six_months" ? "6 Months" : "Monthly";
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="rounded-3xl bg-gradient-to-r from-[#04122D] to-[#0D2A5E] p-6 text-white shadow-lg md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
            Founder Control
          </p>

          <h1 className="mt-3 text-3xl font-bold md:text-4xl">
            Subscription Management
          </h1>

          <p className="mt-3 max-w-3xl text-gray-300">
            View all premium subscription requests, payment status, billing
            cycles, expiration dates, and subscriber information.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          {["active", "pending", "expired", "cancelled", "all"].map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-xl px-4 py-3 font-semibold capitalize ${
                  statusFilter === status
                    ? "bg-[#D4AF37] text-[#071A3D]"
                    : "bg-[#0D2A5E] text-white"
                }`}
              >
                {status}
              </button>
            )
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-white p-5 text-[#071A3D] shadow-lg">
          <input
            type="text"
            placeholder="Search by name, email, country, plan, or plan key..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3 outline-none"
          />
        </div>

        <div className="mt-6 rounded-2xl bg-[#0D2A5E] p-6 text-white shadow-lg">
          <h2 className="text-2xl font-bold">Subscriptions</h2>

          {loading ? (
            <div className="mt-6 rounded-xl bg-white p-6 text-[#071A3D]">
              Loading subscriptions...
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-gray-500 p-10 text-center text-gray-400">
              No subscriptions found.
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {filteredSubscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="rounded-2xl bg-white p-5 text-[#071A3D] shadow"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <h3 className="text-xl font-bold">
                        {subscription.user?.full_name || "Unknown Subscriber"}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {subscription.user?.email || "No email"} •{" "}
                        {subscription.user?.country || "Unknown country"}
                      </p>

                      <p className="mt-3 text-2xl font-bold">
                        {subscription.plan_name}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {formatBillingCycle(subscription.billing_cycle)} •{" "}
                        {formatMoney(subscription.amount_usd)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${
                        subscription.computed_status === "active"
                          ? "bg-green-100 text-green-700"
                          : subscription.computed_status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : subscription.computed_status === "expired"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {subscription.computed_status}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-4">
                    <div className="rounded-xl bg-gray-100 p-4">
                      <p className="text-sm text-gray-500">Payment Status</p>
                      <p className="mt-1 font-bold capitalize">
                        {subscription.payment_status || "Unknown"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-100 p-4">
                      <p className="text-sm text-gray-500">Started</p>
                      <p className="mt-1 font-bold">
                        {formatDate(subscription.started_at)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-100 p-4">
                      <p className="text-sm text-gray-500">Expires</p>
                      <p className="mt-1 font-bold">
                        {formatDate(subscription.expires_at)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-100 p-4">
                      <p className="text-sm text-gray-500">Created</p>
                      <p className="mt-1 font-bold">
                        {formatDate(subscription.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl bg-gray-100 p-4">
                      <p className="text-sm text-gray-500">Plan Key</p>
                      <p className="mt-1 break-all font-bold">
                        {subscription.plan_key}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-100 p-4">
                      <p className="text-sm text-gray-500">
                        NOWPayments ID
                      </p>
                      <p className="mt-1 break-all font-mono text-sm">
                        {subscription.nowpayments_payment_id || "Not created"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-100 p-4">
                      <p className="text-sm text-gray-500">Crypto Paid</p>
                      <p className="mt-1 font-bold">
                        {subscription.pay_amount
                          ? `${subscription.pay_amount} ${
                              subscription.pay_currency?.toUpperCase() || ""
                            }`
                          : "Not available"}
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