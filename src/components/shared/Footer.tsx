"use client";

import Link from "next/link";
import {
  FaFacebookF,
  FaInstagram,
  FaTelegramPlane,
  FaTiktok,
} from "react-icons/fa";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-[#D4AF37]/20 bg-[#04122D] text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-8 md:flex-row">
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-bold text-[#D4AF37]">
            Dessetra Network
          </h2>

          <p className="mt-2 max-w-md text-sm text-gray-400">
            Learn • Connect • Earn
          </p>

          <p className="mt-3 text-xs text-gray-500">
            © {currentYear} Dessetra Network. All Rights Reserved.
          </p>
        </div>

        <div className="flex items-center gap-5 text-2xl">
          <Link
            href="https://www.tiktok.com/@dessetranetwork"
            target="_blank"
            className="transition hover:text-[#D4AF37]"
            aria-label="TikTok"
          >
            <FaTiktok />
          </Link>

          <Link
            href="https://www.instagram.com/dessetranetwork"
            target="_blank"
            className="transition hover:text-[#D4AF37]"
            aria-label="Instagram"
          >
            <FaInstagram />
          </Link>

          <Link
            href="https://t.me/dessetracommunity"
            target="_blank"
            className="transition hover:text-[#D4AF37]"
            aria-label="Telegram"
          >
            <FaTelegramPlane />
          </Link>

          <Link
            href="https://www.facebook.com/share/1B3gD28PFh"
            target="_blank"
            className="transition hover:text-[#D4AF37]"
            aria-label="Facebook"
          >
            <FaFacebookF />
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-3 text-center text-xs text-gray-500">
        Empowering the future of Web3 education, investing, and community.
      </div>
    </footer>
  );
}