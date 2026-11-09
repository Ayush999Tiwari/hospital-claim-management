
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  MotionConfig,
  animate,
  motion,
  useInView,
  useReducedMotion,
} from "framer-motion";
import gsap from "gsap";
import { animate as anime, stagger } from "animejs";
import { HeartPulse } from "lucide-react";


const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/* -------------------------------------------------------------------------- */
/*  Small building blocks                                                      */
/* -------------------------------------------------------------------------- */

/** A line of headline text that slides up from behind a mask. */
function MaskLine({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <span className="-mb-[0.1em] block overflow-hidden pb-[0.1em]">
      <motion.span
        className="block"
        initial={{ y: "108%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.95, ease: EASE, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/** A section with its number and title in the left column, content on the right. */
function Section({
  index,
  id,
  title,
  note,
  children,
}: {
  index: string;
  id: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.8, ease: EASE }}
      aria-labelledby={id}
      className="grid gap-8 border-t border-ink pt-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12"
    >
      <div className="font-data text-[11px] uppercase leading-5 tracking-[0.16em] text-muted">
        <p>{index}</p>
        <h2 id={id} className="mt-1 text-ink">
          {title}
        </h2>
        {note && <p className="mt-1">{note}</p>}
      </div>
      <div>{children}</div>
    </motion.section>
  );
}

/** Counts up once when scrolled into view. Shows the final value instantly if motion is reduced. */
function CountUp({
  to,
  decimals = 0,
  prefix = "",
}: {
  to: number;
  decimals?: number;
  prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(to);
      return;
    }
    const controls = animate(0, to, {
      duration: 1.6,
      ease: EASE,
      onUpdate: setValue,
    });
    return () => controls.stop();
  }, [inView, reduced, to]);

  return (
    <span ref={ref}>
      <span className="sr-only">
        {prefix}
        {to}
      </span>
      <span aria-hidden="true">
        {prefix}
        {value.toFixed(decimals)}
      </span>
    </span>
  );
}

function formatClock(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Reply countdown, the same idea the query inbox will use. */
function Countdown({ startSeconds }: { startSeconds: number }) {
  const reduced = useReducedMotion();
  const [left, setLeft] = useState(startSeconds);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <p className="font-data text-xs text-alert">
      Reply due in <span className="tabular-nums">{formatClock(left)}</span>
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero                                                                       */
/* -------------------------------------------------------------------------- */


export function IntroHero() {
  return (
    <MotionConfig reducedMotion="user">
      <section className="relative grid min-h-[calc(100svh-76px)] items-center gap-14 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex items-center gap-3"
          >
            <span className="h-px w-9 bg-[#66856D]" />
            <p className="font-data text-[10px] uppercase tracking-[0.22em] text-muted">
              Hospital insurance operations
            </p>
          </motion.div>

          <h1 className="mt-9 max-w-3xl text-[clamp(3.5rem,7vw,7rem)] font-semibold leading-[0.91] tracking-[-0.075em]">
            <MaskLine delay={0.1}>Less chaos.</MaskLine>
            <MaskLine delay={0.2}>
              <span className="font-display italic font-normal text-[#66856D]">
                More
              </span>{" "}
              clarity.
            </MaskLine>
            <MaskLine delay={0.3}>Better claims.</MaskLine>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mt-9 max-w-lg text-base leading-8 text-muted sm:text-lg"
          >
            The operating workspace for hospital insurance teams.
            Organise documents, follow insurer requirements and keep
            every approval moving — without losing control of the process.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4"
          >
            <a
              href="#how-title"
              className="group inline-flex items-center gap-3 text-sm font-semibold"
            >
              Discover the workflow
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line transition-all duration-300 group-hover:border-ink group-hover:bg-ink group-hover:text-paper">
                ↗
              </span>
            </a>

            <span className="text-xs text-muted">
              Built for hospital insurance desks
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.25 }}
          className="relative mx-auto w-full max-w-[440px]"
        >
          <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-[#DDE8DF] blur-3xl opacity-70" />

          <div className="relative overflow-hidden rounded-[2rem] border border-[#D9DED5] bg-[#EAEDE5] p-7 sm:p-9">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#203D2D] text-white">
                  <HeartPulse size={21} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#203D2D]">
                    ClaimFlow
                  </p>
                  <p className="text-[10px] tracking-wide text-[#788579]">
                    A clearer way to work
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-[#CFD8CC] px-3 py-1 text-[9px] uppercase tracking-[0.15em] text-[#55715B]">
                Connected
              </span>
            </div>

            <div className="mt-12">
              <p className="font-data text-[10px] uppercase tracking-[0.2em] text-[#788579]">
                One coordinated process
              </p>
              <h2 className="mt-3 max-w-xs text-[2.3rem] font-semibold leading-[1.05] tracking-[-0.06em] text-[#203D2D]">
                From admission to approval.
              </h2>
            </div>

            <div className="relative mt-10 space-y-0">
              {[
                ["01", "Collect", "Documents in one place"],
                ["02", "Verify", "Insurer-specific requirements"],
                ["03", "Coordinate", "Queries and team actions"],
                ["04", "Resolve", "Track the approval journey"],
              ].map(([number, title, description], index) => (
                <div key={number} className="relative flex gap-4 pb-7 last:pb-0">
                  {index !== 3 && (
                    <span className="absolute left-[15px] top-8 h-full w-px bg-[#C8D2C5]" />
                  )}
                  <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#C8D2C5] bg-[#EAEDE5] font-data text-[9px] text-[#55715B]">
                    {number}
                  </span>
                  <div className="pt-0.5">
                    <p className="text-sm font-semibold text-[#203D2D]">
                      {title}
                    </p>
                    <p className="mt-1 text-xs text-[#788579]">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex items-center justify-between border-t border-[#D2D9CE] pt-5">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#788579]">
                Human-led decisions
              </span>
              <span className="text-xs font-semibold text-[#55715B]">
                AI assisted · Team controlled
              </span>
            </div>
          </div>

          <div className="absolute -bottom-5 -left-5 rounded-2xl border border-line bg-card px-5 py-4 shadow-xl shadow-[#203D2D]/10">
            <p className="text-[9px] uppercase tracking-[0.16em] text-muted">
              Designed around
            </p>
            <p className="mt-1 text-sm font-semibold tracking-tight">
              People. Process. Precision.
            </p>
          </div>
        </motion.div>

        <div className="flex items-center gap-4 lg:col-span-2">
          <span className="h-px w-10 bg-[#66856D]" />
          <span className="font-data text-[10px] uppercase tracking-[0.2em] text-muted">
            A more connected insurance desk
          </span>
        </div>
      </section>
    </MotionConfig>
  );
}


/* -------------------------------------------------------------------------- */
/*  Details: sample desk, cost of the problem, how it works                   */
/* -------------------------------------------------------------------------- */

type Claim = {
  id: string;
  patient: string;
  insurer: string;
  procedure: string;
  status: string;
  missing: string | null;
  replyDueSeconds?: number;
};

// Sample data from the assignment brief.
const CLAIMS: readonly Claim[] = [
  {
    id: "CLM-3381",
    patient: "Rajendra Pawar",
    insurer: "Company B (TPA)",
    procedure: "Gall bladder removal",
    status: "Query",
    missing: "Ultrasound report",
    replyDueSeconds: 2 * 3600 + 14 * 60 + 9,
  },
  {
    id: "CLM-3382",
    patient: "Sunita Deshmukh",
    insurer: "Company C (insurer)",
    procedure: "Total knee replacement",
    status: "Pre-auth sent",
    missing: null,
  },
  {
    id: "CLM-3385",
    patient: "Imran Shaikh",
    insurer: "Company D (TPA)",
    procedure: "Dengue with low platelets",
    status: "Enhancement",
    missing: "Latest platelet count",
  },
];

const STEPS = [
  {
    title: "One claim file per admission",
    body: "Pre-auth, query, approved, final bill, settled. One timeline.",
  },
  {
    title: "Gaps show before you send",
    body: "A checklist per insurer and procedure. What is missing comes first.",
  },
  {
    title: "Queries run on a clock",
    body: "AI summarises the TPA email and starts the reply countdown. The original email stays in view.",
  },
] as const;

const STAT_NUMBER =
  "text-[clamp(2.6rem,5vw,4.2rem)] font-semibold leading-none tracking-[-0.045em] tabular-nums";
const STAT_UNIT = "ml-1.5 text-base font-normal tracking-normal text-muted";

export function IntroDetails() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-24 pb-28 pt-12 lg:space-y-32 lg:pb-36">
        {/* Sample desk */}
        <Section index="01" id="desk-title" title="Today’s desk" note="Sample data">
          <ul className="border-b border-line">
            {CLAIMS.map((claim) => (
              <li
                key={claim.id}
                className="grid gap-4 border-t border-line py-7 first:border-t-0 first:pt-0 sm:grid-cols-[1fr_auto] sm:gap-10"
              >
                <div>
                  <p className="font-data text-[11px] tracking-wider text-muted">
                    {claim.id} · {claim.insurer}
                  </p>
                  <p className="mt-1.5 text-2xl font-medium tracking-tight">
                    {claim.patient}
                  </p>
                  <p className="text-sm text-muted">{claim.procedure}</p>
                </div>

                <div className="flex flex-col items-start gap-2 sm:items-end sm:text-right">
                  <span className="rounded-full border border-line bg-card px-3 py-1 text-[11px] font-medium">
                    {claim.status}
                  </span>
                  {claim.missing ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-alert">
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full bg-alert"
                      />
                      Missing: {claim.missing}
                    </p>
                  ) : (
                    <p className="text-sm text-muted">Nothing missing</p>
                  )}
                  {claim.replyDueSeconds !== undefined && (
                    <Countdown startSeconds={claim.replyDueSeconds} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* Cost of the problem */}
        <Section index="02" id="cost-title" title="What it costs today">
          <dl className="grid gap-10 sm:grid-cols-3 sm:gap-8">
            <div className="flex flex-col">
              <dd className={`order-1 ${STAT_NUMBER}`}>
                <CountUp to={63.57} decimals={2} prefix="₹" />
                <span className={STAT_UNIT}>lakh</span>
              </dd>
              <dt className="order-2 mt-3 text-sm leading-6 text-muted">
                lost a year to missing documents and unanswered queries
              </dt>
            </div>
            <div className="flex flex-col">
              <dd className={`order-1 ${STAT_NUMBER}`}>
                <CountUp to={4.5} decimals={1} />
                <span className={STAT_UNIT}>hours</span>
              </dd>
              <dt className="order-2 mt-3 text-sm leading-6 text-muted">
                wait for discharge approval
              </dt>
            </div>
            <div className="flex flex-col">
              <dd className={`order-1 ${STAT_NUMBER}`}>
                <CountUp to={30} />
                <span className={STAT_UNIT}>%</span>
              </dd>
              <dt className="order-2 mt-3 text-sm leading-6 text-muted">
                of claims get a query from the insurer
              </dt>
            </div>
          </dl>
          <p className="mt-8 text-xs leading-5 text-muted">
            Company A, Nashik · 180 beds · 7,800 cashless claims a year. Working
            estimates from the brief’s own assumptions.
          </p>
        </Section>

        {/* How it works */}
        <Section index="03" id="how-title" title="How it works">
          <ol className="border-b border-line">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="grid grid-cols-[3.5rem_1fr] border-t border-line py-7 first:border-t-0 first:pt-0"
              >
                <span className="font-data pt-1.5 text-xs text-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-xl font-medium tracking-tight">{step.title}</h3>
                  <p className="mt-1.5 max-w-[34rem] text-sm leading-6 text-muted">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <p className="font-display mt-14 text-[clamp(2rem,3.6vw,3rem)] leading-tight tracking-[-0.02em]">
            AI suggests. People confirm.
          </p>
          <p className="mt-2 text-sm text-muted">
            Nothing is sent to a TPA automatically.
          </p>
        </Section>
      </div>
    </MotionConfig>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sign-in aside: one claim file at a glance, and what success looks like    */
/* -------------------------------------------------------------------------- */

type StageState = "done" | "current" | "next";

const STAGES: readonly { label: string; state: StageState }[] = [
  { label: "Pre-auth", state: "done" },
  { label: "Query", state: "current" },
  { label: "Approved", state: "next" },
  { label: "Final bill", state: "next" },
  { label: "Settled", state: "next" },
];

const DOT_STYLE: Record<StageState, string> = {
  done: "bg-paper",
  current: "border-2 border-alert bg-ink",
  next: "border border-paper/30 bg-ink",
};

const LABEL_STYLE: Record<StageState, string> = {
  done: "text-paper/70",
  current: "font-medium text-paper",
  next: "text-paper/40",
};

const TARGETS = [
  { value: "−40%", label: "avoidable deductions" },
  { value: "<2.5 h", label: "discharge approval, down from 4.5 h" },
  { value: "90%", label: "of queries answered the same day" },
] as const;

export function SignInAside() {
  const cardRef = useRef<HTMLDivElement>(null);
  const stagesRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const stages = stagesRef.current;
    if (!card || !stages) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cleanups: Array<() => void> = [];
    const anims: Array<{ revert: () => unknown }> = [];

    // GSAP: the claim card leans toward the pointer
    const ctx = gsap.context(() => {
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      gsap.set(card, { transformPerspective: 900 });
      const rx = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3" });
      const ry = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3" });
      const onMove = (event: PointerEvent) => {
        const rect = card.getBoundingClientRect();
        ry(((event.clientX - rect.left) / rect.width - 0.5) * 6);
        rx(-((event.clientY - rect.top) / rect.height - 0.5) * 5);
      };
      const onLeave = () => {
        ry(0);
        rx(0);
      };
      card.addEventListener("pointermove", onMove);
      card.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        card.removeEventListener("pointermove", onMove);
        card.removeEventListener("pointerleave", onLeave);
      });
    }, card);

    // anime.js: the timeline draws itself once it is on screen
    const lines = stages.querySelectorAll("[data-line]");
    const dots = stages.querySelectorAll("[data-dot]");
    const ping = stages.querySelector("[data-ping]");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        anims.push(
          anime(dots, {
            scale: [0, 1],
            duration: 520,
            delay: stagger(170),
            ease: "outBack",
          }),
          anime(lines, {
            scaleX: [0, 1],
            duration: 620,
            delay: stagger(170, { start: 120 }),
            ease: "outQuad",
          }),
        );
        if (ping) {
          anims.push(
            anime(ping, {
              scale: [1, 2.6],
              opacity: [0.8, 0],
              duration: 1700,
              delay: 1300,
              ease: "outQuad",
              loop: true,
            }),
          );
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(stages);

    return () => {
      observer.disconnect();
      cleanups.forEach((fn) => fn());
      anims.forEach((anim) => anim.revert());
      ctx.revert();
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        transition={{ duration: 0.8, ease: EASE }}
        className="space-y-12"
      >
        {/* One claim file, at a glance */}
        <div ref={cardRef} className="rounded-2xl border border-paper/15 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-data text-[11px] tracking-wider text-paper/50">
                CLM-3381 · Company B (TPA)
              </p>
              <p className="mt-1.5 text-xl font-medium tracking-tight">
                Rajendra Pawar
              </p>
              <p className="text-sm text-paper/50">Gall bladder removal</p>
            </div>
            <span className="rounded-full border border-paper/20 px-3 py-1 text-[11px] font-medium">
              Query
            </span>
          </div>

          <ol
            ref={stagesRef}
            className="mt-9 grid grid-cols-5"
            aria-label="Claim status timeline"
          >
            {STAGES.map((stage, index) => (
              <li key={stage.label} className="relative">
                {index < STAGES.length - 1 && (
                  <span
                    aria-hidden="true"
                    data-line
                    className={`absolute left-0 top-[6px] h-px w-full origin-left ${
                      stage.state === "done" ? "bg-paper" : "bg-paper/20"
                    }`}
                  />
                )}
                {stage.state === "current" && (
                  <span
                    aria-hidden="true"
                    data-ping
                    className="absolute left-0 top-0 h-3.5 w-3.5 rounded-full border border-alert opacity-0"
                  />
                )}
                <span
                  aria-hidden="true"
                  data-dot
                  className={`relative z-10 block h-3.5 w-3.5 rounded-full ${DOT_STYLE[stage.state]}`}
                />
                <p className={`mt-3 text-xs ${LABEL_STYLE[stage.state]}`}>
                  {stage.label}
                  <span className="sr-only">
                    {stage.state === "done"
                      ? " (done)"
                      : stage.state === "current"
                        ? " (current)"
                        : ""}
                  </span>
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-paper/15 pt-5">
            <p className="flex items-center gap-2 text-sm font-medium text-alert">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-alert" />
              Missing: Ultrasound report
            </p>
            <Countdown startSeconds={2 * 3600 + 14 * 60 + 9} />
          </div>
        </div>

        {/* What success looks like */}
        <div>
          <p className="font-data text-[11px] uppercase tracking-[0.16em] text-paper/50">
            Targets in six months
          </p>
          <dl className="mt-5 grid gap-8 border-t border-paper/15 pt-6 sm:grid-cols-3 sm:gap-6">
            {TARGETS.map((target) => (
              <div key={target.label} className="flex flex-col">
                <dd className="order-1 text-4xl font-semibold leading-none tracking-[-0.04em] tabular-nums">
                  {target.value}
                </dd>
                <dt className="order-2 mt-3 text-sm leading-6 text-paper/55">
                  {target.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </motion.div>
    </MotionConfig>
  );
}