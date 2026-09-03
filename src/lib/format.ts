/**
 * formatCOP(140000) -> "$140.000"
 * Formato Colombia: separador de miles ".", sin decimales, sin espacio.
 */
export function formatCOP(n: number): string {
  const entero = Math.round(n);
  const conPuntos = entero
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `$${conPuntos}`;
}

/**
 * Construye el link de WhatsApp con el mensaje pre-rellenado.
 * waMsg usa el placeholder "{producto}".
 */
export function waLink(
  whatsapp: string,
  waMsg: string,
  producto: string
): string {
  const texto = waMsg.replace("{producto}", producto);
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(texto)}`;
}
