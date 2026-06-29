"use client";

import { useEffect, useState } from "react";

const launchDate = new Date("2026-07-04T00:00:00+01:00").getTime();

function calculateTimeLeft() {
  const now = new Date().getTime();
  const difference = launchDate - now;

  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      launched: true,
    };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    launched: false,
  };
}

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const timeBoxes = [
    { label: "Days", value: timeLeft.days },
    { label: "Hrs", value: timeLeft.hours },
    { label: "Min", value: timeLeft.minutes },
    { label: "Sec", value: timeLeft.seconds },
  ];

  return (
    <div className="mt-8 w-full max-w-3xl rounded-2xl border border-[#D4AF37]/40 bg-[#04122D]/80 p-5 shadow-2xl backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
        Soft Launch Countdown
      </p>

      <p className="mt-2 text-sm text-gray-300">
        Dessetra soft-launches on Saturday, 4th July 2026 at 00:00 West African
        Time.
      </p>

      <div className="mt-5 grid grid-cols-4 gap-3">
        {timeBoxes.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[#D4AF37]/30 bg-white/10 px-3 py-4"
          >
            <p className="text-2xl font-bold text-[#D4AF37] md:text-4xl">
              {String(item.value).padStart(2, "0")}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-300">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {timeLeft.launched && (
        <p className="mt-4 text-sm font-semibold text-[#D4AF37]">
          Launch time has arrived.
        </p>
      )}
    </div>
  );
}