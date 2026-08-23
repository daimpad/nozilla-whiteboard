/**
 * Welcher Stand hier gerade läuft.
 *
 * Die drei Werte kommen aus `vite.config.ts` und stehen nach dem Bauen als
 * Literale im Bündel. Sichtbar sind sie unten links in der Bibliothek — nicht
 * aus Eitelkeit, sondern damit eine Rückmeldung („bei mir sieht das anders
 * aus") auf einen Commit zurückzuführen ist. Ohne diese Angabe ist die Frage
 * „welchen Stand hast du geladen?" nicht zu beantworten.
 */
export const build = {
  version: __APP_VERSION__,
  commit: __APP_COMMIT__,
  built: __APP_BUILT__,
} as const;

/** Das Datum des Stands, deutsch und ohne Uhrzeit. */
export function buildDate(): string {
  const date = new Date(build.built);
  if (Number.isNaN(date.getTime())) return build.built;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
