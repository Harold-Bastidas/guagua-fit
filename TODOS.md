# TODOS

## Product

### Expandir a las 3 zonas restantes (Levantamiento, Kettlebells, Magnesio)

**What:** Construir las otras 3 zonas del gymBox al mismo nivel que "Grips y Muñequeras" — ilustración/coords reales, productos reales, dejan de mostrar "Pronto".

**Why:** El vertical-slice deliberadamente construyó 1 zona al 100% en vez de 4 al 40%. Esta es la expansión natural post-aprobación.

**Context:** La arquitectura ya generaliza — `ProductGrid.astro` y `Panel.astro` son zone-agnostic, y `GymBox.astro` deriva la lista de productos de cada zona filtrando `productos[].zona` (ver fix de `zonas.json[].productos` en el CEO plan de 2026-09-04). Falta: ilustración de cada zona (mismo proceso IA que se usó para "escena.jpg"), coords de hotspot/zoom, productos reales con fotos.

**Effort:** M (por zona: human ~1-2h / CC ~20-30min)
**Priority:** P1 (bloqueado por la aprobación de José, no por trabajo pendiente)
**Depends on:** José aprueba el concepto actual del vertical-slice.

---

### Pipeline de fotos para productos 100% nuevos

**What:** Permitir que José agregue un producto NUEVO (no solo editar uno existente) con su propia foto, sin pasar por Harold.

**Why:** El swap de datos a Google Sheet (CEO plan 2026-09-04) resuelve editar precio/descripción/stock de productos ya cargados, pero un producto nuevo con foto nueva sigue necesitando que Harold suba el archivo al repo. Es el límite honesto de esa fase, no un descuido.

**Context:** Se evaluó reconsiderar toda la arquitectura hacia un formulario custom + imagen en un proveedor gestionado (Cloudinary/Uploadcare) que resolvería esto de raíz — el outside voice (Codex) lo propuso explícitamente. Se decidió mantener la Sheet por ahora: cero curva de aprendizaje para José vs. una pieza de software nueva para mantener. Revisar esta decisión si el volumen de productos nuevos hace doler "pasar por Harold" en la práctica. Si se retoma: José pega un link de imagen (Drive público o similar) en una columna de la Sheet, el build la descarga y procesa con `astro:assets` — tiene sus propios modos de falla (link roto, imagen gigante, formato raro) que habría que resolver.

**Effort:** L (human ~1 día / CC ~2-3h)
**Priority:** P3 — revisar en 3-6 meses según uso real
**Depends on:** Ninguno bloqueante, pero tiene sentido después de validar que el resto del loop (edición de existentes) funciona bien en la práctica.
