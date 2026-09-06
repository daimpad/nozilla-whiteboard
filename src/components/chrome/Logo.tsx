/**
 * Die Wortmarke in der Anwendungsoberfläche.
 *
 * Sie gehört dem **Werkzeug** und nicht dem Deck: gezeichnet werden die Pfade
 * aus `wordmark.generated`, also die von nozilla, und daneben stand ihr Punkt
 * bisher in der *lebendigen* Signalfarbe. Damit war sie beides halb — ein
 * nozilla-Schriftzug, dessen Punkt die Farbe der Marke annahm, deren Deck
 * gerade offen ist. Gemessen unter dem Musterkunden: #FF5A1F statt #00FF9C,
 * ein oranger Punkt an einem Zeichen, das nicht ihm gehört.
 *
 * Beides kommt jetzt aus derselben Quelle. Das ist zugleich die Regel des
 * Projekts — die Oberfläche leiht sich nichts von der Marke des Decks, auch
 * keinen Akzent —, und die eine Ausnahme davon ist genau dieses Zeichen: es
 * ist das des Werkzeugs.
 *
 * Für die Wortmarke gilt weiter, was für sie überall gilt: nicht drehen,
 * nicht umfärben, nicht verzerren, kein Schatten.
 */
import { nozillaTheme } from '@/theme';
import { wordmark } from '@/assets/wordmark.generated';

export function Logo({ height = 20, className }: { height?: number; className?: string }) {
  const [x, y, w, h] = wordmark.viewBox;
  return (
    <svg
      height={height}
      width={(w / h) * height}
      viewBox={`${x} ${y} ${w} ${h}`}
      className={className}
      role="img"
      aria-label="nozilla"
    >
      <path d={wordmark.letters} fill="currentColor" />
      <path d={wordmark.period} fill={nozillaTheme.palette.signal} />
    </svg>
  );
}
