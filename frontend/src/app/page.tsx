
import {
  IntroDetails,
  IntroHero,
  SignInAside,
} from "@/components/auth/Loginintro";

import LoginForm from "@/components/auth/LoginForm";
import { HeartPulse } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur-2xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          <a
            href="#"
            className="group flex items-center gap-3"
            aria-label="ClaimFlow home"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-paper shadow-sm transition-transform duration-300 group-hover:rotate-[-6deg]">
              <HeartPulse size={22} strokeWidth={1.8} />
            </span>

            <span className="text-base font-semibold tracking-[-0.045em]">
              ClaimFlow
            </span>
          </a>

          <nav
            className="hidden items-center gap-9 text-[13px] font-medium text-muted md:flex"
            aria-label="Main navigation"
          >
            <a
              href="#how-title"
              className="transition-colors hover:text-ink"
            >
              How it works
            </a>

            <a
              href="#cost-title"
              className="transition-colors hover:text-ink"
            >
              The opportunity
            </a>
          </nav>

          <a
            href="#signin"
            className="group inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-xs font-semibold text-paper transition-all duration-300 hover:bg-[#315C43] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/20"
          >
            Desk sign in
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <IntroHero />

        <IntroDetails />

        {/* Existing login section preserved */}
        <section
          id="signin"
          aria-labelledby="signin-section-title"
          className="-mx-5 grid scroll-mt-24 gap-12 bg-ink px-5 py-14 text-paper sm:-mx-8 sm:px-8 sm:py-16 lg:-mx-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-12 lg:py-20"
        >
          <div className="flex flex-col justify-center">
            <p className="font-data text-[11px] uppercase tracking-[0.16em] text-paper/50">
              Secure hospital workspace
            </p>

            <h2
              id="signin-section-title"
              className="font-display mt-4 max-w-xl text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.98] tracking-[-0.04em]"
            >
              Keep every claim moving.
            </h2>

            <p className="mt-5 max-w-lg text-sm leading-7 text-paper/60">
              One place for admission documents, insurer checklists and
              time-sensitive TPA queries. AI can assist; your team stays in
              control.
            </p>

            <div className="mt-12">
              <SignInAside />
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-full">
              <LoginForm />

              <p className="mt-4 text-center text-xs leading-5 text-paper/45">
                Authorized hospital insurance desk staff only.
              </p>
            </div>
          </div>
        </section>
      </div>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-[11px] uppercase tracking-[0.12em] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <span>ClaimFlow · Hospital insurance claims desk</span>
        <span>AI suggests. People confirm.</span>
      </footer>
    </main>
  );
}
