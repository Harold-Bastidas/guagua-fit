// ┌──────────────────────────────────────────────────────────────────────────┐
// │ gymbox.ts — cámara por transform + panel + trap de foco.                  │
// │                                                                          │
// │ LAS 3 RUTAS DE LA INTERACCIÓN                                             │
// │                                                                          │
// │  1. NORMAL (JS + motion OK)                                               │
// │       tap / Enter en hotspot                                              │
// │       → gsap.to('.camara', { scale, xPercent, yPercent, transformOrigin,  │
// │                              duration: 0.7 / 0.5 móvil, ease power3.inOut })│
// │       → fade-in scrim (opacity, --negro-scrim)                            │
// │       → fade-in panel (opacity + translateY 16px), foco al panel, trap    │
// │       cierre: Esc / "volver" → revierte el tween → foco vuelve al hotspot │
// │                                                                          │
// │  2. REDUCED-MOTION (JS, prefers-reduced-motion: reduce)                   │
// │       sin tween — gsap.set('.camara') directo al estado final            │
// │       fade corto del panel (0.15s). Cierre = gsap.set de vuelta.         │
// │                                                                          │
// │  3. SIN JS                                                                │
// │       este módulo no corre. Los hotspots activos son <a href="#grips">   │
// │       y navegan a la sección keynote. Los inactivos (<button>) no hacen  │
// │       nada. La sección keynote es visible por defecto.                    │
// └──────────────────────────────────────────────────────────────────────────┘

import gsap from "gsap";
import zonas from "../data/zonas.json";

type Zona = (typeof zonas)[number];

const FOCUSABLE =
  'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

export function initGymBox(): void {
  const camara = document.querySelector<HTMLElement>("[data-camara]");
  const scrim = document.querySelector<HTMLElement>("[data-scrim]");
  if (!camara || !scrim) return;

  const hotspots = Array.from(
    document.querySelectorAll<HTMLElement>("[data-hotspot]")
  );
  const panels = new Map<string, HTMLElement>();
  document
    .querySelectorAll<HTMLElement>("[data-panel]")
    .forEach((el) => panels.set(el.dataset.panel!, el));

  const prontoPanel = panels.get("__pronto");
  const mqMobile = window.matchMedia("(max-width: 900px)");
  const mqReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  let openPanel: HTMLElement | null = null;
  let originHotspot: HTMLElement | null = null;
  let trapHandler: ((e: KeyboardEvent) => void) | null = null;

  function zoneFor(id: string): Zona | undefined {
    return zonas.find((z) => z.id === id);
  }

  function trapFocus(panel: HTMLElement): void {
    const nodes = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE)
    ).filter((n) => n.offsetParent !== null);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    trapHandler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("keydown", trapHandler);
  }

  function open(zona: Zona, origin: HTMLElement): void {
    const panel = zona.activa ? panels.get(zona.id) : prontoPanel;
    if (!panel) return;

    originHotspot = origin;
    openPanel = panel;

    const reduced = mqReduced.matches;
    const mobile = mqMobile.matches;
    // La escena es panorámica: en móvil el object-fit:cover recorta los
    // costados, así que el origen del zoom usa hotspotMobile si existe
    // (misma razón por la que Hotspot.astro tiene --x-m/--y-m).
    const zoomOrigin =
      mobile && zona.hotspotMobile ? zona.hotspotMobile : zona.hotspot;
    const target = {
      scale: mobile ? 1.8 : zona.zoom.scale,
      xPercent: zona.zoom.x,
      yPercent: zona.zoom.y,
      transformOrigin: `${zoomOrigin.left}% ${zoomOrigin.top}%`,
    };

    if (zona.activa) {
      if (reduced) {
        gsap.set(camara!, target);
      } else {
        gsap.to(camara!, {
          ...target,
          duration: mobile ? 0.5 : 0.7,
          ease: "power3.inOut",
        });
      }
    }

    // scrim
    gsap.to(scrim!, {
      opacity: 1,
      duration: reduced ? 0.12 : 0.3,
      onStart: () => {
        scrim!.style.pointerEvents = "auto";
      },
    });

    // panel
    panel.hidden = false;
    gsap.fromTo(
      panel,
      { opacity: 0, y: reduced ? 0 : 16 },
      { opacity: 1, y: 0, duration: reduced ? 0.15 : 0.35, ease: "power2.out" }
    );

    document.body.style.overflow = "hidden";
    trapFocus(panel);
    const firstFocus = panel.querySelector<HTMLElement>(FOCUSABLE);
    firstFocus?.focus();
  }

  function close(): void {
    if (!openPanel) return;
    const panel = openPanel;
    const reduced = mqReduced.matches;

    if (trapHandler) {
      panel.removeEventListener("keydown", trapHandler);
      trapHandler = null;
    }

    gsap.to(panel, {
      opacity: 0,
      y: reduced ? 0 : 8,
      duration: reduced ? 0.12 : 0.25,
      onComplete: () => {
        panel.hidden = true;
      },
    });

    gsap.to(scrim!, {
      opacity: 0,
      duration: reduced ? 0.12 : 0.3,
      onComplete: () => {
        scrim!.style.pointerEvents = "none";
      },
    });

    if (reduced) {
      gsap.set(camara!, { scale: 1, xPercent: 0, yPercent: 0 });
    } else {
      gsap.to(camara!, {
        scale: 1,
        xPercent: 0,
        yPercent: 0,
        duration: 0.6,
        ease: "power3.inOut",
      });
    }

    document.body.style.overflow = "";
    openPanel = null;

    const origin = originHotspot;
    originHotspot = null;
    origin?.focus();
  }

  // Wire hotspots.
  for (const el of hotspots) {
    const id = el.dataset.hotspot!;
    const zona = zoneFor(id);
    if (!zona) continue;
    el.addEventListener("click", (e) => {
      e.preventDefault(); // intercepta el <a href="#grips"> de las activas
      open(zona, el);
    });
  }

  // Close controls (delegated — panels comparten data-attrs).
  document.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-panel-close]")) {
      close();
    }
    if (t.closest("[data-panel-verzona]")) {
      e.preventDefault();
      close();
      const grips = document.getElementById("grips");
      grips?.scrollIntoView({
        behavior: mqReduced.matches ? "auto" : "smooth",
      });
    }
  });

  // Scrim click cierra.
  scrim.addEventListener("click", close);

  // Esc.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openPanel) close();
  });
}
