/**
 * Die Erscheinungsbilder, die dieser Browser kennt — und der Weg, eines
 * dazuzuholen.
 *
 * Eine Schicht und kein Feld im Inspektor, und die Trennung ist die aus dem
 * Kopf von `SettingsMenu.tsx`: die **Wahl** eines Erscheinungsbilds gehört
 * dem Deck und steht im Inspektor; was dieser Browser überhaupt *kennt*,
 * gehört dem Arbeitsplatz. Ein Import ändert das Zweite und nicht das Erste.
 * Deshalb stellt er das Deck auch nicht von selbst um — das ist ein eigener
 * Knopf, der danach dasteht.
 *
 * Gelesen und übernommen sind zwei Handgriffe. Dazwischen steht, was die
 * Prüfliste sagt, welche Schriftdateien hier fehlen und ob eine vorhandene
 * Marke ersetzt würde. „Eine Quittung ist kein Vorschlag" steht in CLAUDE.md
 * für den Rücklauf des Sprachmodells, und hier gilt dasselbe: ein Import, der
 * erst übernimmt und dann prüft, hat nichts mehr zu fragen.
 */
import { useState } from 'react';
import { availableThemes } from '@/theme';
import { useThemeVersion } from '@/hooks/useTheme';
import { useFokusZurueck } from '@/hooks/useFokusZurueck';
import { useDeckStore } from '@/state/deckStore';
import { grund } from '@/state/persistence';
import { saveText } from '@/lib/export/download';
import {
  anmeldebericht,
  entferneImport,
  gemerkterEntwurf,
  istImportiert,
  pruefeImport,
  uebernehmeImport,
  type Importpruefung,
  type Importvorschlag,
} from '@/themes/importe';
import { Button, IconButton, SectionTitle } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';

type Stand =
  | { art: 'leer' }
  | { art: 'liest'; datei: string }
  | { art: 'geprueft'; datei: string; ergebnis: Importpruefung }
  | { art: 'uebernommen'; id: string; label: string; ablagefehler: string | null };

export function MarkenPanel() {
  useFokusZurueck();
  // Die Liste liest das Verzeichnis, und das ändert sich unter ihr: ein
  // Import, ein Entfernen, ein anderes Fenster.
  useThemeVersion();
  const close = useDeckStore((state) => state.toggleMarken);
  const deckMarke = useDeckStore((state) => state.deck.meta.theme);
  const setDeckMeta = useDeckStore((state) => state.setDeckMeta);
  const zeigeHinweis = useDeckStore((state) => state.zeigeHinweis);
  const [stand, setStand] = useState<Stand>({ art: 'leer' });
  /*
     Ein ruhender Eintrag war nie angemeldet. Sein Entfernen ändert deshalb
     nichts am Verzeichnis, der Zähler bleibt stehen, und ohne diesen eigenen
     Anstoß bliebe die Zeile nach „Entfernen" einfach da.
  */
  const [, stosse] = useState(0);

  const bekannt = availableThemes();
  const ruhend = anmeldebericht().gescheitert;

  const lies = async (datei: File) => {
    setStand({ art: 'liest', datei: datei.name });
    const ergebnis = await pruefeImport(await datei.text());
    setStand({ art: 'geprueft', datei: datei.name, ergebnis });
  };

  const uebernimm = (vorschlag: Importvorschlag) => {
    const ablagefehler = uebernehmeImport(vorschlag);
    setStand({
      art: 'uebernommen',
      id: vorschlag.entwurf.id,
      label: vorschlag.entwurf.label,
      ablagefehler,
    });
  };

  const entferne = (id: string, label: string) => {
    /*
       Gefragt wird immer, und genauer, wenn das offene Deck die Marke trägt:
       es steht danach in nozilla. Der Eintrag im Deck bleibt — wie bei jedem
       unbekannten Schlüssel —, und wer die Datei wieder importiert, bekommt
       sein Deck zurück.
    */
    const frage =
      deckMarke === id
        ? `„${label}" aus diesem Browser entfernen? Das offene Deck trägt diese Marke und steht danach in nozilla; der Eintrag in der Datei bleibt.`
        : `„${label}" aus diesem Browser entfernen?`;
    if (!window.confirm(frage)) return;
    entferneImport(id);
    stosse((n) => n + 1);
    if (stand.art === 'uebernommen' && stand.id === id) setStand({ art: 'leer' });
  };

  const sichere = async (id: string) => {
    const entwurf = gemerkterEntwurf(id);
    if (!entwurf) return;
    try {
      await saveText(JSON.stringify(entwurf, null, 2), `${id}.nzci.json`, 'application/json');
    } catch (fehler) {
      // Ein geschlossener Dateidialog ist die Antwort „doch nicht".
      if (fehler instanceof DOMException && fehler.name === 'AbortError') return;
      zeigeHinweis(`Die Datei ließ sich nicht aushändigen. ${grund(fehler)}`);
    }
  };

  return (
    <div
      className="absolute left-1/2 top-16 z-modal w-[34rem] max-w-[calc(100%-2rem)] -translate-x-1/2 animate-pop-in"
      role="dialog"
      aria-label="Erscheinungsbilder"
    >
      <div className="nz-panel flex max-h-[75vh] flex-col overflow-hidden shadow-ui-xl">
        <div className="flex items-center gap-2 border-b border-ui px-3 py-2">
          <h2 className="flex-1 text-ui-title font-semibold">Erscheinungsbilder</h2>
          <IconButton
            icon="xmark"
            label="Erscheinungsbilder schließen (Esc)"
            onClick={() => close(false)}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          <SectionTitle>Dieser Browser kennt</SectionTitle>
          <ul className="mb-3 flex flex-col">
            {bekannt.map(({ id, label }) => {
              const eigen = istImportiert(id);
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 border-b border-ui py-1.5 last:border-b-0"
                  aria-label={`Erscheinungsbild ${label}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-ui-body text-ui-ink">{label}</span>
                    <span className="block font-mono text-[11px] text-ui-faint">
                      {id} · {eigen ? 'importiert' : 'mitgeliefert'}
                      {deckMarke === id ? ' · dieses Deck' : ''}
                    </span>
                  </span>
                  {eigen ? (
                    <>
                      <IconButton
                        icon="download"
                        label={`„${label}" als .nzci.json sichern`}
                        onClick={() => void sichere(id)}
                      />
                      <IconButton
                        icon="trash"
                        tone="danger"
                        label={`„${label}" entfernen`}
                        onClick={() => entferne(id, label)}
                      />
                    </>
                  ) : null}
                </li>
              );
            })}
            {ruhend.map(({ id, grund: warum }) => (
              <li key={`ruht-${id}`} className="flex items-center gap-2 border-b border-ui py-1.5">
                <Icon name="triangle-exclamation" size={14} className="shrink-0 text-ui-warn" />
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[11px] text-ui-ink">{id} · ruht</span>
                  <span className="block text-[11px] leading-snug text-ui-muted">{warum}</span>
                </span>
                <IconButton
                  icon="trash"
                  tone="danger"
                  label={`Eintrag „${id}" entfernen`}
                  onClick={() => entferne(id, id)}
                />
              </li>
            ))}
          </ul>

          <SectionTitle>Importieren</SectionTitle>
          <p className="mb-2 text-[11px] leading-snug text-ui-muted">
            Eine <span className="font-mono">.nzci.json</span> aus dem CI-Generator („Entwurf
            sichern"). Sie geht durch dieselbe Prüfliste wie dort, und die Schriften müssen unter{' '}
            <span className="font-mono">public/fonts/</span> liegen — die Bibliothek im Generator
            bietet nur solche an. Ein Erscheinungsbild gilt der Folie; die Leisten bleiben, wie sie
            sind.
          </p>
          {/*
            Ein `sr-only`-Feld und kein `hidden`: `display: none` nimmt es aus
            dem Baum, und dann erreicht es keine Tastatur. Dieselbe Lösung wie
            „Entwurf laden" im Generator, aus demselben Grund.
          */}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-ui bg-ui-surface px-3 py-1.5 text-ui-body font-medium text-ui-ink hover:border-ui-strong hover:bg-ui-subtle">
            <Icon name="upload" size={15} />
            Datei wählen…
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(event) => {
                const datei = event.target.files?.[0];
                event.target.value = '';
                if (datei) void lies(datei);
              }}
            />
          </label>

          <Ergebnis
            stand={stand}
            deckMarke={deckMarke}
            uebernimm={uebernimm}
            verwirf={() => setStand({ art: 'leer' })}
            stelleUm={(id) => setDeckMeta({ theme: id })}
          />
        </div>
      </div>
    </div>
  );
}

function Ergebnis({
  stand,
  deckMarke,
  uebernimm,
  verwirf,
  stelleUm,
}: {
  stand: Stand;
  deckMarke: string | undefined;
  uebernimm: (vorschlag: Importvorschlag) => void;
  verwirf: () => void;
  stelleUm: (id: string) => void;
}) {
  if (stand.art === 'leer') return null;
  if (stand.art === 'liest') {
    return <p className="mt-3 text-ui-body text-ui-muted">„{stand.datei}" wird gelesen …</p>;
  }

  if (stand.art === 'uebernommen') {
    return (
      <div className="mt-3 border border-ui bg-ui-subtle px-3 py-2" role="status">
        <p className="flex items-center gap-2 text-ui-body text-ui-ink">
          <Icon name="circle-check" size={15} />„{stand.label}" ist angemeldet.
        </p>
        {stand.ablagefehler ? (
          <p className="mt-1 text-[11px] leading-snug text-ui-warn">{stand.ablagefehler}</p>
        ) : null}
        {deckMarke === stand.id ? (
          <p className="mt-1 text-[11px] leading-snug text-ui-muted">
            Das offene Deck trägt diese Marke und steht jetzt darin.
          </p>
        ) : (
          <Button
            variant="primary"
            className="mt-2"
            icon="arrow-right"
            onClick={() => stelleUm(stand.id)}
          >
            Dieses Deck auf „{stand.label}" umstellen
          </Button>
        )}
      </div>
    );
  }

  const { ergebnis, datei } = stand;
  if (!ergebnis.ok) {
    return (
      <div className="mt-3 border border-ui-danger bg-ui-danger-bg px-3 py-2" role="alert">
        <p className="text-ui-body text-ui-danger">
          „{datei}" lässt sich nicht importieren. {ergebnis.grund}
        </p>
        {ergebnis.befunde?.length ? (
          <ul className="mt-1 list-disc pl-4 text-[11px] leading-snug text-ui-ink">
            {ergebnis.befunde.map((befund, index) => (
              <li key={index}>
                {befund.feld}: {befund.text}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  const { vorschlag } = ergebnis;
  const { entwurf } = vorschlag;
  const { befunde } = vorschlag;
  return (
    <div className="mt-3 border border-ui bg-ui-surface px-3 py-2" aria-label="Befund zum Import">
      <p className="text-ui-body text-ui-ink">
        „{entwurf.label}"{' '}
        <span className="font-mono text-[11px] text-ui-faint">({entwurf.id})</span>
      </p>

      {vorschlag.ersetzt ? (
        <p className="mt-1 text-[11px] leading-snug text-ui-warn">
          Ersetzt das importierte Erscheinungsbild „{entwurf.id}". Die Fassung von vorher geht
          verloren — wer sie behalten will, sichert sie vorher oben in der Liste.
        </p>
      ) : null}

      {vorschlag.fehlendeSchnitte.length ? (
        <div className="mt-1 text-[11px] leading-snug text-ui-warn">
          Diese Schriftdateien liegen hier nicht; ihr Text steht auf dem Bildschirm und in jeder
          Ausgabe in einer Ersatzschrift:
          <ul className="list-disc pl-4 font-mono">
            {vorschlag.fehlendeSchnitte.map(({ datei: name }) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {vorschlag.verworfen.length ? (
        <p className="mt-1 text-[11px] leading-snug text-ui-warn">
          Nicht zu gebrauchen und auf nozillas Wert gefallen: {vorschlag.verworfen.join(', ')}.
        </p>
      ) : null}

      {befunde.length ? (
        <ul className="mt-1 flex flex-col gap-1">
          {befunde.map((befund, index) => (
            <li
              key={index}
              className="border border-ui-strong px-2 py-1 text-[11px] leading-snug text-ui-ink"
            >
              <span className="font-semibold">Läuft, ist aber falsch · {befund.feld}</span>{' '}
              {befund.text}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-2 flex gap-2">
        <Button variant="primary" icon="check" onClick={() => uebernimm(vorschlag)}>
          {vorschlag.ersetzt ? 'Ersetzen' : 'Anmelden'}
        </Button>
        <Button variant="ghost" onClick={verwirf}>
          Verwerfen
        </Button>
      </div>
    </div>
  );
}
