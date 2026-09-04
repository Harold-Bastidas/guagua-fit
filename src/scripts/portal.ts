// portal.ts — cámara hacia la puerta + corte a negro + scroll a #top.
// Ver el comentario ASCII en Portal.astro para las 3 rutas de interacción.

import gsap from "gsap";

export function initPortal(): void {
  const root = document.querySelector<HTMLElement>("[data-portal]");
  const camara = document.querySelector<HTMLElement>("[data-portal-camara]");
  const scrim = document.querySelector<HTMLElement>("[data-portal-scrim]");
  const destino = document.getElementById("top");
  if (!root || !camara || !scrim || !destino) return;

  const mqMobile = window.matchMedia("(max-width: 900px)");
  const mqReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  let entering = false;

  function enter(): void {
    if (entering) return;
    entering = true;

    const reduced = mqReduced.matches;
    const mobile = mqMobile.matches;

    if (reduced) {
      gsap.set(scrim, { opacity: 1 });
      destino!.scrollIntoView({ behavior: "auto" });
      destino!.focus({ preventScroll: true });
      gsap.to(scrim, { opacity: 0, duration: 0.15, delay: 0.05 });
      return;
    }

    const zoomDuration = mobile ? 0.6 : 0.9;
    const scrimDuration = mobile ? 0.45 : 0.6;

    const tl = gsap.timeline();
    tl.to(
      camara,
      { scale: mobile ? 1.35 : 1.6, duration: zoomDuration, ease: "power2.in" },
      0
    );
    tl.to(
      scrim,
      { opacity: 1, duration: scrimDuration, ease: "power1.in" },
      zoomDuration - scrimDuration
    );
    tl.call(() => {
      destino!.scrollIntoView({ behavior: "auto" });
      destino!.focus({ preventScroll: true });
    });
    tl.to(scrim, { opacity: 0, duration: 0.4, ease: "power1.out" });
  }

  // Click en cualquier punto de la puerta (la sección entera) o en el CTA:
  // un solo handler delegado. El <a href="#top"> es el fallback sin JS.
  root.addEventListener("click", (e) => {
    e.preventDefault();
    enter();
  });
}
