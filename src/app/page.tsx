export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#071A3D] text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">
          Learn • Connect • Earn
        </p>

        <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
          Start Your Web3 Journey the Right Way
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-gray-300">
          Learn how Web3 works, protect yourself from scams, and discover real
          opportunities before risking your money.
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <a
            href="/auth/signup"
            className="rounded-lg bg-[#D4AF37] px-6 py-3 font-semibold text-[#071A3D]"
          >
            Get Started for Free
          </a>

          <a
            href="/auth/login"
            className="rounded-lg border border-white/30 px-6 py-3 font-semibold text-white"
          >
            Login
          </a>
        </div>
      </section>
    </main>
  );
}