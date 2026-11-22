const scoreDateFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Formatea un timestamp ISO como `DD/MM/YYYY` en UTC. */
export function formatScoreDate(iso: string): string {
  return scoreDateFormatter.format(new Date(iso));
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Devuelve un tiempo relativo corto: `hace 2 min`, `hace 3 h`, `hace 5 d`.
 * Las fechas futuras se muestran como `hace 0 min`.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());

  if (diff < HOUR_MS) {
    return `hace ${Math.floor(diff / MINUTE_MS)} min`;
  }

  if (diff < DAY_MS) {
    return `hace ${Math.floor(diff / HOUR_MS)} h`;
  }

  return `hace ${Math.floor(diff / DAY_MS)} d`;
}
