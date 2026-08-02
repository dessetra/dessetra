"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Footer from "@/components/shared/Footer";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

type NavigationLink = {
  label: string;
  href: string;
};

const mainNavLinks: NavigationLink[] = [
  {
    label: "Dessetra Academy",
    href: "/dashboard/academy",
  },
  {
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    label: "Learn",
    href: "/dashboard/learn",
  },
  {
    label: "Invest",
    href: "/dashboard/invest",
  },
  {
    label: "Investor Dashboard",
    href: "/dashboard/investor",
  },
];

const profileNavLinks: NavigationLink[] = [
  {
    label: "My Profile",
    href: "/dashboard/profile",
  },
  {
    label: "Referrals",
    href: "/dashboard/referrals",
  },
  {
    label: "Earnings",
    href: "/dashboard/earnings",
  },
  {
    label: "Wallet",
    href: "/dashboard/wallet",
  },
  {
    label: "Subscriptions",
    href: "/dashboard/subscriptions",
  },
];

const supportHref =
  "mailto:support@dessetra.com?subject=Dessetra%20Support%20Request";

function routeMatches(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const profileSectionActive = profileNavLinks.some((link) =>
    routeMatches(pathname, link.href)
  );

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/auth/login");
        return;
      }

      setCheckingAuth(false);
    }

    void checkSession();
  }, [router]);

  useEffect(() => {
    if (profileSectionActive) {
      setProfileMenuOpen(true);
    }
  }, [profileSectionActive]);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  }

  function renderMainNavigation(isMobile: boolean) {
    return (
      <nav className="mt-6 space-y-3">
        {mainNavLinks.map((link) => {
          const active = routeMatches(pathname, link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={isMobile ? closeMobileMenu : undefined}
              aria-current={active ? "page" : undefined}
              className={`block rounded-lg border px-4 py-3 text-base font-medium transition ${
                active
                  ? "border-[#D4AF37]/60 bg-[#D4AF37] text-[#071A3D]"
                  : "border-transparent bg-[#0D2A5E]/70 text-white hover:bg-[#0D2A5E]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}

        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0D2A5E]/45">
          <button
            type="button"
            onClick={() =>
              setProfileMenuOpen((currentValue) => !currentValue)
            }
            aria-expanded={profileMenuOpen}
            aria-controls={
              isMobile
                ? "mobile-profile-submenu"
                : "desktop-profile-submenu"
            }
            className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-base font-medium transition ${
              profileSectionActive
                ? "bg-[#0D2A5E] text-[#D4AF37]"
                : "text-white hover:bg-[#0D2A5E]"
            }`}
          >
            <span>Profile</span>

            <span
              aria-hidden="true"
              className={`text-sm transition-transform duration-200 ${
                profileMenuOpen ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>

          <div
            id={
              isMobile
                ? "mobile-profile-submenu"
                : "desktop-profile-submenu"
            }
            className={`grid transition-all duration-300 ${
              profileMenuOpen
                ? "grid-rows-[1fr] border-t border-white/10"
                : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <div className="space-y-2 p-3">
                {profileNavLinks.map((link) => {
                  const active = routeMatches(pathname, link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={isMobile ? closeMobileMenu : undefined}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-lg px-4 py-3 text-sm transition ${
                        active
                          ? "bg-[#D4AF37] font-bold text-[#071A3D]"
                          : "bg-[#04122D]/70 text-gray-200 hover:bg-[#12366f]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}

                <a
                  href={supportHref}
                  onClick={isMobile ? closeMobileMenu : undefined}
                  className="block rounded-lg bg-[#04122D]/70 px-4 py-3 text-sm text-gray-200 transition hover:bg-[#12366f]"
                >
                  Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#071A3D] text-white">
        <p>Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#071A3D] text-white">
      <header className="sticky top-0 z-40 flex items-center justify-between bg-[#04122D] px-5 py-4 shadow-lg md:hidden">
        <div>
          <h1 className="text-2xl font-bold text-[#D4AF37]">
            Dessetra
          </h1>

          <p className="text-xs text-gray-400">
            Learn • Connect • Earn
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="rounded-lg bg-[#0D2A5E] px-4 py-2 text-2xl font-bold"
          aria-label="Open menu"
          aria-expanded={mobileMenuOpen}
        >
          ☰
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu overlay"
            onClick={closeMobileMenu}
            className="absolute inset-0 bg-black/60"
          />

          <aside className="relative z-10 flex h-full w-80 max-w-[85%] flex-col bg-[#04122D] p-5 shadow-2xl">
            <div className="flex shrink-0 items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#D4AF37]">
                  Dessetra
                </h1>

                <p className="mt-1 text-sm text-gray-400">
                  Learn • Connect • Earn
                </p>
              </div>

              <button
                type="button"
                onClick={closeMobileMenu}
                className="rounded-lg bg-[#0D2A5E] px-3 py-2 text-xl font-bold"
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {renderMainNavigation(true)}

              <button
                type="button"
                onClick={handleLogout}
                className="mb-4 mt-6 w-full rounded-lg bg-[#D4AF37] px-4 py-3 font-semibold text-[#071A3D] transition hover:bg-[#e0bd48]"
              >
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="min-h-screen md:flex">
        <aside className="hidden bg-[#04122D] p-5 md:sticky md:top-0 md:block md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto">
          <h1 className="text-2xl font-bold text-[#D4AF37]">
            Dessetra
          </h1>

          <p className="mt-1 text-sm text-gray-400">
            Learn • Connect • Earn
          </p>

          {renderMainNavigation(false)}

          <button
            type="button"
            onClick={handleLogout}
            className="mb-4 mt-5 w-full rounded-lg bg-[#D4AF37] px-4 py-3 font-semibold text-[#071A3D] transition hover:bg-[#e0bd48]"
          >
            Logout
          </button>
        </aside>

        <section className="flex min-h-screen min-w-0 flex-1 flex-col">
          <div className="flex-1 p-4 md:p-6">{children}</div>

          <Footer />
        </section>
      </div>

      <Link
        href="/dashboard/invest"
        className="fixed bottom-6 right-6 z-40 rounded-full bg-[#D4AF37] px-6 py-4 font-bold text-[#071A3D] shadow-2xl transition hover:scale-105"
      >
        Invest
      </Link>
    </main>
  );
}