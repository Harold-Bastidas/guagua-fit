# GuaguaFit

Sitio web para GuaguaFit (cliente: José), tienda de material de entrenamiento para crossfitters. Estética "keynote de Apple" con un gymBox interactivo (escena SVG a pantalla completa, hotspots por zona, cámara GSAP).

Stack objetivo: Astro + Tailwind + GSAP, sitio estático, deploy en Vercel. Sin backend (CTA a WhatsApp).

Documento de diseño: `docs/designs/guaguafit-cinematic-gymbox.md`

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
