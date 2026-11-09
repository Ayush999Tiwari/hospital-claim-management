"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { animate, svg } from "animejs";
import { Check } from "lucide-react";

/**
 * A 3D stack of claim documents.
 *  - Front card: the insurer checklist, four items collected, one missing.
 *  - Behind it: the documents that fill the checklist.
 *  - Dashed slot floating in front: the gap the desk must close.
 *
 * GSAP: pointer tilt, per-card hover lift, scroll-driven "explode", intro.
 * anime.js: ECG line and the pulse on the missing slot.
 * All of it is decorative, so the whole thing is hidden from screen readers.
 */

const CHECKLIST = [
  { label: "Pre-auth form", ok: true },
  { label: "Doctor’s notes", ok: true },
  { label: "Admission note", ok: true },
  { label: "Lab report", ok: true },
  { label: "Ultrasound report", ok: false },
] as const;

const BACK_DOCS = [
  { title: "Doctor’s notes", lines: [92, 78, 88, 60, 82] },
  { title: "Lab report", lines: [80, 94, 70, 88, 64] },
  { title: "Admission note", lines: [88, 64, 90, 72, 84] },
] as const;

const CARD_W = 320;
const CARD_H = 340;
const FIT_WIDTH = 560; // width the full stack needs before it gets scaled down

// Resting position of each layer (0 = front card)
const LAYERS = [
  { x: 0, y: 0, z: 0 },
  { x: 36, y: -24, z: -90 },
  { x: 72, y: -48, z: -180 },
  { x: 108, y: -72, z: -270 },
] as const;

const SLOT_Z = 90;
const HOVER_LIFT = 60;

export default function ClaimStack() {
  const rootRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const tilt = tiltRef.current;
    const scene = sceneRef.current;
    if (!root || !tilt || !scene) return;

    gsap.registerPlugin(ScrollTrigger);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const cards = gsap.utils.toArray<HTMLElement>("[data-layer]", root);
    const slot = root.querySelector<HTMLElement>("[data-slot]");
    const ecgPath = root.querySelector<SVGPathElement>("[data-ecg]");
    const ping = root.querySelector<HTMLElement>("[data-ping]");

    const cleanups: Array<() => void> = [];
    const anims: Array<{ revert: () => unknown }> = [];

    const ctx = gsap.context(() => {
      // Resting pose
      gsap.set(scene, { rotationY: -24, rotationX: 9 });
      gsap.set(cards, {
        x: (i: number) => LAYERS[i].x,
        y: (i: number) => LAYERS[i].y,
        z: (i: number) => LAYERS[i].z,
      });
      if (slot) gsap.set(slot, { z: SLOT_Z });

      // Scale the whole stack down on narrow screens
      const fit = () =>
        gsap.set(tilt, { scale: Math.min(1, root.clientWidth / FIT_WIDTH) });
      fit();
      window.addEventListener("resize", fit);
      cleanups.push(() => window.removeEventListener("resize", fit));

      gsap.set(root, { opacity: 1 });

      if (reduced) return;

      // Intro: cards drop in from depth, the missing slot arrives last
      gsap.from(cards, {
        opacity: 0,
        z: "-=260",
        y: "+=50",
        duration: 1.2,
        stagger: 0.12,
        ease: "power3.out",
        delay: 0.3,
      });
      if (slot) {
        gsap.from(slot, {
          opacity: 0,
          z: `+=${SLOT_Z}`,
          duration: 1,
          ease: "power3.out",
          delay: 1.1,
        });
        gsap.to(slot, {
          yPercent: -8,
          duration: 2.2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }

      // The stack opens up as the hero scrolls away
      gsap
        .timeline({
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        })
        .to(scene, { rotationY: -52, rotationX: 16, ease: "none" }, 0)
        .to(
          cards,
          {
            x: (i: number) => LAYERS[i].x + i * 46,
            y: (i: number) => LAYERS[i].y - i * 10,
            ease: "none",
          },
          0,
        );

      if (canHover) {
        // Whole stack follows the pointer
        const rx = gsap.quickTo(tilt, "rotationX", { duration: 0.8, ease: "power3" });
        const ry = gsap.quickTo(tilt, "rotationY", { duration: 0.8, ease: "power3" });
        const onMove = (event: PointerEvent) => {
          const rect = root.getBoundingClientRect();
          const px = (event.clientX - rect.left) / rect.width - 0.5;
          const py = (event.clientY - rect.top) / rect.height - 0.5;
          ry(px * 16);
          rx(-py * 12);
        };
        const onLeave = () => {
          ry(0);
          rx(0);
        };
        root.addEventListener("pointermove", onMove);
        root.addEventListener("pointerleave", onLeave);
        cleanups.push(() => {
          root.removeEventListener("pointermove", onMove);
          root.removeEventListener("pointerleave", onLeave);
        });

        // A card lifts toward you when you point at it
        cards.forEach((card, i) => {
          const enter = () =>
            gsap.to(card, {
              z: LAYERS[i].z + HOVER_LIFT,
              duration: 0.45,
              ease: "power3.out",
              overwrite: "auto",
            });
          const leave = () =>
            gsap.to(card, {
              z: LAYERS[i].z,
              duration: 0.6,
              ease: "power3.out",
              overwrite: "auto",
            });
          card.addEventListener("pointerenter", enter);
          card.addEventListener("pointerleave", leave);
          cleanups.push(() => {
            card.removeEventListener("pointerenter", enter);
            card.removeEventListener("pointerleave", leave);
          });
        });
      }
    }, root);

    // anime.js: ECG trace and the pulse on the missing slot
    if (!reduced) {
      if (ecgPath) {
        const [drawable] = svg.createDrawable(ecgPath);
        anims.push(
          animate(drawable, {
            draw: ["0 0", "0 1", "1 1"],
            duration: 2800,
            ease: "inOutQuad",
            loop: true,
          }),
        );
      }
      if (ping) {
        anims.push(
          animate(ping, {
            scale: [1, 2.6],
            opacity: [0.7, 0],
            duration: 1700,
            ease: "outQuad",
            loop: true,
          }),
        );
      }
    }

    return () => {
      cleanups.forEach((fn) => fn());
      anims.forEach((anim) => anim.revert());
      ctx.revert();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="relative mx-auto h-[420px] w-full max-w-[560px] select-none overflow-x-clip lg:h-[560px] lg:max-w-none"
      style={{ perspective: 1400, opacity: 0 }}
    >
      <div
        ref={tiltRef}
        className="absolute inset-0 flex items-center justify-center"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          ref={sceneRef}
          className="relative -ml-[108px]"
          style={{ width: CARD_W, height: CARD_H, transformStyle: "preserve-3d" }}
        >
          {/* Front: the checklist */}
          <div
            data-layer
            className="absolute inset-0 flex flex-col rounded-2xl border border-line bg-white p-6 shadow-[0_40px_70px_-35px_rgba(14,14,12,0.45)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-data text-[11px] tracking-wider text-muted">
                  CLM-3381
                </p>
                <p className="mt-1 text-lg font-medium tracking-tight">
                  Claim checklist
                </p>
                <p className="text-xs text-muted">Gall bladder removal</p>
              </div>
              <span className="font-data text-xs text-muted">4 / 5</span>
            </div>

            <ul className="mt-5 space-y-2.5 text-sm">
              {CHECKLIST.map((item) => (
                <li key={item.label} className="flex items-center gap-3">
                  {item.ok ? (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ink text-paper">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="h-4 w-4 rounded-full border border-dashed border-alert" />
                  )}
                  <span className={item.ok ? "" : "font-medium text-alert"}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>

            <svg
              viewBox="0 0 272 44"
              className="mt-auto h-11 w-full text-ink"
              fill="none"
            >
              <path
                data-ecg
                d="M0 24 H70 L80 24 L88 8 L98 38 L106 14 L112 24 H150 L158 24 L164 12 L172 34 L178 24 H272"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Behind: the documents */}
          {BACK_DOCS.map((doc) => (
            <div
              key={doc.title}
              data-layer
              className="absolute inset-0 rounded-2xl border border-line bg-[#fbfaf6] p-6"
            >
              <p className="font-data text-[11px] uppercase tracking-wider text-muted">
                {doc.title}
              </p>
              <div className="mt-5 space-y-3">
                {doc.lines.map((width, index) => (
                  <span
                    key={index}
                    className="block h-1.5 rounded-full bg-line"
                    style={{ width: `${width}%` }}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* In front: the gap */}
          <div
            data-slot
            className="absolute left-[130px] top-[318px] flex w-[220px] items-center gap-3 rounded-xl border border-dashed border-alert bg-paper px-4 py-3"
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span
                data-ping
                className="absolute inset-0 rounded-full bg-alert opacity-0"
              />
              <span className="relative h-2.5 w-2.5 rounded-full bg-alert" />
            </span>
            <span>
              <span className="font-data block text-[10px] uppercase tracking-wider text-alert">
                Missing
              </span>
              <span className="block text-sm font-medium text-alert">
                Ultrasound report
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}