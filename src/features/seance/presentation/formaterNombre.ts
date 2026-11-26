const FORMAT = new Intl.NumberFormat('fr-FR')

/** Nombre au format français (« 1 420 »). */
export function formaterNombre(nombre: number): string {
  return FORMAT.format(nombre)
}
