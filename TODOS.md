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

### ~~Pipeline de fotos para productos 100% nuevos~~ — hecho (2026-09-17)

Implementado: columna opcional `imagen_url` en la Sheet. José pega ahí el link de "Compartir" de Drive (el normal, sin tocar nada especial) de la foto del producto nuevo; `scripts/check-data.mjs` la descarga en cada build (convierte el link a descarga directa, valida que el contenido sea realmente una imagen — si el link no está compartido como "Cualquier usuario con el enlace", Drive devuelve HTML y el build falla con ese error puntual, no un mensaje genérico) y la guarda en `src/assets/productos/<imagen>`. Cero credenciales nuevas — mismo patrón de fetch anónimo que ya usa el resto del pipeline.

**Pendiente:** agregar el header `imagen_url` a la fila 1 de la Sheet (Harold, manual — no hay API para editar celdas de Sheets) y avisarle a José el paso nuevo. Falta probar con una foto real compartida por él (el mecanismo de conversión de link está cubierto por tests unitarios, pero no se corrió contra un archivo de Drive realmente público por no tener forma de activar el toggle de sharing vía API).

**Carpeta centralizada (2026-09-17):** "GuaguaFit - Fotos de productos" en Drive de Harold, id `1MZ4yEBF4k7mrKNDDsh0j4LUZqnJfUGiS` (https://drive.google.com/drive/folders/1MZ4yEBF4k7mrKNDDsh0j4LUZqnJfUGiS), compartida con José (`josembm1230@gmail.com`, rol editor) para que suba ahí sus fotos en vez de tenerlas sueltas en su Drive. Es **solo organización** — no cambia el mecanismo: compartir la carpeta con José le da permiso de subir archivos, pero cada foto individual todavía necesita su propio "Compartir → Cualquier usuario con el enlace" antes de pegar el link en `imagen_url` (el permiso de la carpeta no se hereda como link público en los archivos que suba).

**Si el volumen de fotos nuevas crece mucho:** reconsiderar la opción con cuenta de servicio (carpeta compartida una vez, José solo nombra el archivo = slug, sin copiar links por producto) — se evaluó y se descartó por ahora a favor de esta, más simple y sin credenciales que mantener.
