/**
 * Die Warnung, wenn sich die Sitzung nicht mehr merken lässt.
 *
 * Sie steht quer über dem Fenster und nicht als Zeichen in der Leiste, weil
 * die Nachricht keine Nebensache ist: von hier an sichert sich **gar nichts**
 * mehr von selbst, und wer das nicht erfährt, arbeitet weiter im Vertrauen
 * darauf, dass es geschieht.
 *
 * Der Grund ist fast immer derselbe — ein eingebettetes Bild. Das Kontingent
 * von `localStorage` liegt bei etwa fünf Megabyte; ein Foto aus einem Telefon
 * belegt als data-URI in UTF-16 gut zehn. Eingesetzte Bilder werden deshalb
 * beim Einsetzen auf die Rasterbreite gekappt (`imageElement.ts`), und diese
 * Warnung ist das, was danach noch übrig bleiben kann: viele Bilder, oder ein
 * Deck, das seine Ablage aus anderen Gründen nicht mehr bekommt.
 */
import { useState } from 'react';
import { sichereDeck } from '@/state/persistence';
import { useDeckStore } from '@/state/deckStore';
import { Button } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';

export function SessionWarning() {
  const gescheitert = useDeckStore((state) => state.sicherungGescheitert);
  const [laeuft, setLaeuft] = useState(false);

  if (!gescheitert) return null;

  const sichern = async () => {
    setLaeuft(true);
    try {
      await sichereDeck();
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <div
      role="alert"
      className="flex shrink-0 items-center gap-2 border-b border-ui-warn bg-ui-warn-bg px-3 py-2 text-ui-body text-ui-ink"
    >
      <Icon name="triangle-exclamation" size={15} className="shrink-0 text-ui-warn" />
      <span className="min-w-0 flex-1">
        Diese Sitzung lässt sich nicht mehr im Browser merken — meist, weil ein eingebettetes Bild
        zu groß ist. <strong>Sichere das Deck als Datei</strong>, sonst ist die Arbeit weg, sobald
        das Fenster zugeht.
      </span>
      <Button icon="download" onClick={sichern} disabled={laeuft} className="shrink-0">
        Sichern
      </Button>
    </div>
  );
}
