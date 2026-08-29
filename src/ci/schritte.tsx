/**
 * Die Schritte des Generators — und was in jedem davon ausgefüllt wird.
 *
 * ## Warum aus einer Spalte acht Schritte wurden
 *
 * Die vorige Fassung stellte alles untereinander: vier Textfelder, sechzehn
 * Farben, drei Stapel, drei Ersatzschriften, neun Schnitte, acht Stufen, drei
 * Sondergrößen, eine Laufweite, vier Striche, vier Schatten, eine Datei und
 * eine Wahl — rund fünfzig Felder in einer Spalte von 440 Pixeln. Wer sie zum
 * ersten Mal sah, sah nicht, wo er anfangen soll, und wer sie zum zweiten Mal
 * sah, scrollte an der Stelle vorbei, die er suchte.
 *
 * Die Schritte ändern daran nichts am Inhalt und alles an der Frage, die auf
 * dem Bildschirm steht. Sie lautet jetzt „welche Farbe ist die Handlungsfarbe"
 * und nicht „welches von fünfzig Feldern ist als Nächstes dran".
 *
 * ## Und warum kein Schritt sperrt
 *
 * Ein Wizard, der erst weiterlässt, wenn der Schritt fehlerfrei ist, sperrt
 * genau den ein, der nachsehen will, wie sich sein halb gefüllter Entwurf auf
 * der Folie macht — und das ist der eigentliche Zweck dieser Seite. Der
 * Schrittbalken *zeigt* deshalb, was offen ist, und hält niemanden auf.
 *
 * Damit er das kann, muss jeder Befund einem Schritt zuzuordnen sein.
 * `FELD_SCHRITT` ist diese Zuordnung, und sie ist ein `Record` über die volle
 * Union: die Vollständigkeit hält der Compiler, nicht ein Test. Was ein Test
 * noch prüft, ist die Gegenrichtung — dass kein Schritt ein Feld führt, das
 * niemand vergibt.
 */
import { useState } from 'react';
import { nozillaTheme, type PaletteRole } from '@/theme';
import { WORTMARKE_HOECHSTLAENGE, ankerFuer, type Feld } from './pruefung';
import { Button, IconButton } from '@/components/ui/controls';
import {
  leererSchnitt,
  paletteRollen,
  pdfSchriften,
  schattenRollen,
  schnittstile,
  schriftRollen,
  sonderstufen,
  strichRollen,
  textStufen,
  type CiEntwurf,
  type PdfSchrift,
  type Schnitt,
  wortmarkeAusSvg,
  type Zeichenwahl,
} from './entwurf';
import { zeichenwahl } from './entwurf';
import { Abschnitt, Farbfeld, Textfeld, Wahlfeld, Zahlenfeld } from './felder';
import {
  PALETTENTEXT,
  SCHATTENTEXT,
  SCHRIFTTEXT,
  STRICHTEXT,
  STUFENTEXT,
  ZEICHENTEXT,
} from './texte';

export type Aendere = (teil: Partial<CiEntwurf>) => void;

export type SchrittId =
  'anfang' | 'marke' | 'farbe' | 'schrift' | 'masse' | 'wortmarke' | 'zeichen' | 'fertig';

export interface SchrittDef {
  id: SchrittId;
  titel: string;
}

/**
 * Die Schritte in ihrer Reihenfolge.
 *
 * Sie folgt der Reihenfolge, in der die Entscheidungen wirklich fallen: erst
 * der Name, dann die Farben (an denen sich sofort sehen lässt, ob die Marke
 * trägt), dann die Schrift — und erst danach die Maße, denn die Leiter wird auf
 * einer Schrift beurteilt und nicht davor: eine Grotesk läuft rund zehn Prozent
 * breiter, und ein Überlauf ist dann eine Folge der Schrift und keine der
 * Zahlen. Wer die Leiter vor die Schrift stellt, stellt sie zweimal.
 *
 * Die Wortmarke bleibt spät. Sie ist die einzige Angabe, für die man eine Datei
 * suchen muss — und wer den Generator zum ersten Mal öffnet, hat sie nicht
 * bereitliegen, sondern muss aufstehen und exportieren. Das an die zweite
 * Stelle zu setzen wäre der schnellste Weg, jemanden zum Abbrechen zu bringen.
 * Dass die Folie bis dahin trotzdem zeichnet, löst `vorschauTheme()`.
 */
export const SCHRITTE: SchrittDef[] = [
  { id: 'anfang', titel: 'Anfang' },
  { id: 'marke', titel: 'Marke' },
  { id: 'farbe', titel: 'Farbe' },
  { id: 'schrift', titel: 'Schrift' },
  { id: 'masse', titel: 'Maße' },
  { id: 'wortmarke', titel: 'Wortmarke' },
  { id: 'zeichen', titel: 'Zeichen' },
  { id: 'fertig', titel: 'Fertig' },
];

/**
 * Welcher Schritt welches Feld der Prüfliste verantwortet.
 *
 * Ein `Record` über die volle Union und keine Liste je Schritt: so ist die
 * Vollständigkeit eine Sache des Compilers. Ein neues Feld ohne Schritt ist ein
 * Übersetzungsfehler — vorher wäre es ein Befund gewesen, den kein Zähler sieht
 * und den die Zahl daneben als „nichts offen" ausgibt.
 */
const FELD_SCHRITT: Record<Feld, SchrittId> = {
  Rücklauf: 'anfang',
  Marke: 'marke',
  Farbe: 'farbe',
  Schrift: 'schrift',
  Maße: 'masse',
  Wortmarke: 'wortmarke',
  Zeichen: 'zeichen',
  Werkzeug: 'fertig',
};

/** Zu welchem Schritt ein Befund gehört. */
export function schrittFuerFeld(feld: Feld): number {
  const ziel = FELD_SCHRITT[feld];
  return SCHRITTE.findIndex((schritt) => schritt.id === ziel);
}

/* -------------------------------------------------------------------------- */
/* Marke                                                                       */
/* -------------------------------------------------------------------------- */

export function MarkeSchritt({ entwurf, aendere }: { entwurf: CiEntwurf; aendere: Aendere }) {
  return (
    <Abschnitt
      titel="Marke"
      hinweis="Der Schlüssel steht im Frontmatter jedes Decks (theme: …) und lässt sich später nicht mehr ändern, ohne jede Datei anzufassen."
    >
      <Textfeld
        label="Schlüssel"
        wert={entwurf.id}
        auf={(id) => aendere({ id })}
        platzhalter="probenhaus"
        hinweis="Kleinschrift, Ziffern, Bindestriche."
      />
      <Textfeld
        label="Name in der Auswahl"
        wert={entwurf.label}
        auf={(label) => aendere({ label })}
        platzhalter="Probenhaus"
      />
      <Textfeld
        label="Markenname"
        wert={entwurf.markenname}
        auf={(markenname) => aendere({ markenname })}
        hinweis="Steht als Urheber in jedem PDF und jeder PPTX."
      />
      <Textfeld
        label="Produktname"
        wert={entwurf.produkt}
        auf={(produkt) => aendere({ produkt })}
        hinweis="Steht in der Beschreibung des SVG."
      />
    </Abschnitt>
  );
}

/* -------------------------------------------------------------------------- */
/* Farbe                                                                       */
/* -------------------------------------------------------------------------- */

export function FarbeSchritt({ entwurf, aendere }: { entwurf: CiEntwurf; aendere: Aendere }) {
  return (
    <Abschnitt
      titel="Farbe"
      hinweis="Sechzehn Rollen. Daraus mischt das Werkzeug neunundzwanzig semantische Tokens und die vier Flächenrollen — danach zu fragen wäre die Fehlerklasse, nicht die Gründlichkeit."
    >
      {paletteRollen.map((rolle: PaletteRole) => (
        <Farbfeld
          key={rolle}
          rolle={rolle}
          label={rolle}
          anker={ankerFuer('Farbe', rolle)}
          wert={entwurf.palette[rolle]}
          hinweis={PALETTENTEXT[rolle]}
          auf={(wert) => aendere({ palette: { ...entwurf.palette, [rolle]: wert } })}
        />
      ))}
    </Abschnitt>
  );
}

/* -------------------------------------------------------------------------- */
/* Schrift                                                                     */
/* -------------------------------------------------------------------------- */

export function SchriftSchritt({ entwurf, aendere }: { entwurf: CiEntwurf; aendere: Aendere }) {
  return (
    <Abschnitt
      titel="Schrift"
      hinweis="Hinter der eigenen Schrift steht die andere dieser Marke, und erst danach das System. Keine Schrift führt jedes Zeichen — ohne eine zweite fällt ⌘ aus PNG und PDF heraus."
    >
      {schriftRollen.map((rolle) => (
        <Textfeld
          key={rolle}
          label={SCHRIFTTEXT[rolle]}
          wert={entwurf.fontFamily[rolle]}
          auf={(wert) => aendere({ fontFamily: { ...entwurf.fontFamily, [rolle]: wert } })}
        />
      ))}

      <p className="pt-1 text-[11px] font-medium text-ui-muted">Ersatz im PDF</p>
      {schriftRollen.map((rolle) => (
        <Wahlfeld<PdfSchrift>
          key={rolle}
          label={SCHRIFTTEXT[rolle]}
          wert={entwurf.pdfFontFamily[rolle]}
          optionen={pdfSchriften.map((wert) => ({ value: wert, label: wert }))}
          auf={(wert) => aendere({ pdfFontFamily: { ...entwurf.pdfFontFamily, [rolle]: wert } })}
        />
      ))}

      <Schnitte entwurf={entwurf} aendere={aendere} />
    </Abschnitt>
  );
}

/**
 * Die selbst gehosteten Schnitte.
 *
 * Sie stehen als Liste und nicht als Formular je Schnitt: wer eine eigene
 * Schrift mitbringt, hat neun Dateien und keine Lust auf sechsunddreißig
 * Felder. Was hier zählt, ist die Zuordnung Familie → Datei — der erste Name
 * jedes Stapels ist ein Fremdschlüssel darauf, und passt er nicht, findet der
 * Export keine Datei und fällt still auf die Ersatzschrift zurück.
 */
function Schnitte({ entwurf, aendere }: { entwurf: CiEntwurf; aendere: Aendere }) {
  /*
     Angefasst wird über die **Kennung** und nicht über den Index. Der Index
     wäre hier zwar ausreichend — die Liste wächst nur am Ende —, aber er ist
     dieselbe Art Schlüssel, die diese Zeile schon einmal unbedienbar gemacht
     hat: einer, der sich mit dem Inhalt bewegt. Die Kennung bewegt sich nie.
  */
  const setze = (kennung: string, teil: Partial<Schnitt>) =>
    aendere({
      webfontFaces: entwurf.webfontFaces.map((face) =>
        face.kennung === kennung ? { ...face, ...teil } : face,
      ),
    });

  return (
    <div>
      <p className="pt-1 text-[11px] font-medium text-ui-muted">
        Schnitte unter <span className="font-mono">public/fonts/</span>
      </p>
      <p className="mb-2 text-[11px] leading-snug text-ui-faint">
        Zu jeder <span className="font-mono">.woff2</span> gehört die gleichnamige{' '}
        <span className="font-mono">.ttf</span>: WOFF2 kann nichts lesen, was Glyphen braucht, und
        PDF wie Umriss-Leser brauchen sie.
      </p>

      <div className="flex flex-col gap-1">
        {entwurf.webfontFaces.map((face, index) => (
          <div key={face.kennung} className="flex gap-1">
            <input
              type="text"
              aria-label={`Familie des ${index + 1}. Schnitts`}
              value={face.family}
              onChange={(event) => setze(face.kennung, { family: event.target.value })}
              className="h-7 w-24 min-w-0 rounded-sm border border-ui bg-ui-surface px-1.5 text-[11px] text-ui-ink focus:border-ui-strong focus:outline-none"
            />
            <input
              type="number"
              aria-label={`Gewicht des ${index + 1}. Schnitts`}
              value={Number.isFinite(face.weight) ? face.weight : ''}
              step={100}
              onChange={(event) =>
                setze(face.kennung, { weight: Number.parseInt(event.target.value, 10) })
              }
              className="h-7 w-14 rounded-sm border border-ui bg-ui-surface px-1.5 text-right tabular-nums text-[11px] text-ui-ink focus:border-ui-strong focus:outline-none"
            />
            {/*
              Kursive Schnitte waren bisher gar nicht anzulegen: `style` stand
              im Schlüssel, aber in keinem Feld. Eine Marke mit einer Kursiven
              hätte sie von Hand nachtragen müssen.
            */}
            <select
              aria-label={`Stil des ${index + 1}. Schnitts`}
              value={face.style}
              onChange={(event) => setze(face.kennung, { style: event.target.value })}
              className="h-7 w-20 rounded-sm border border-ui bg-ui-surface px-1 text-[11px] text-ui-ink focus:border-ui-strong focus:outline-none"
            >
              {schnittstile.map((stil) => (
                <option key={stil} value={stil}>
                  {stil === 'normal' ? 'aufrecht' : 'kursiv'}
                </option>
              ))}
            </select>
            <input
              type="text"
              aria-label={`Datei des ${index + 1}. Schnitts`}
              value={face.file}
              onChange={(event) => setze(face.kennung, { file: event.target.value })}
              className="h-7 min-w-0 flex-1 rounded-sm border border-ui bg-ui-surface px-1.5 font-mono text-[11px] text-ui-ink focus:border-ui-strong focus:outline-none"
            />
            <IconButton
              icon="trash"
              label={`${index + 1}. Schnitt entfernen${face.family ? ` (${face.family} ${face.weight})` : ''}`}
              tone="danger"
              size={13}
              className="h-7 w-7"
              onClick={() =>
                aendere({
                  webfontFaces: entwurf.webfontFaces.filter(
                    (andere) => andere.kennung !== face.kennung,
                  ),
                })
              }
            />
          </div>
        ))}
      </div>

      <Button
        icon="plus"
        className="mt-2 h-7"
        onClick={() => aendere({ webfontFaces: [...entwurf.webfontFaces, leererSchnitt()] })}
      >
        Schnitt
      </Button>
      <p className="mt-1 text-[11px] leading-snug text-ui-faint">
        Vorbelegt sind die {nozillaTheme.webfont.faces.length} Schnitte, die schon unter{' '}
        <span className="font-mono">public/fonts/</span> liegen.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Maße                                                                        */
/* -------------------------------------------------------------------------- */

export function MasseSchritt({ entwurf, aendere }: { entwurf: CiEntwurf; aendere: Aendere }) {
  return (
    <Abschnitt
      titel="Maße"
      hinweis="Die Leiter der Marke. Zeilenhöhe, Schnitt und Versalien bleiben die der Hierarchie — wer sie ändern muss, ändert sie in der erzeugten Datei."
    >
      <p className="text-[11px] font-medium text-ui-muted">Größenleiter</p>
      {textStufen.map((stufe) => (
        <Zahlenfeld
          key={stufe}
          label={stufe}
          anker={ankerFuer('Maße', stufe)}
          einheit="px"
          wert={entwurf.textScale[stufe]}
          auf={(wert) => aendere({ textScale: { ...entwurf.textScale, [stufe]: wert } })}
        />
      ))}

      <p className="pt-2 text-[11px] font-medium text-ui-muted">Stufen außerhalb der Leiter</p>
      {sonderstufen.map((stufe) => (
        <div key={stufe}>
          <Zahlenfeld
            label={stufe}
            anker={ankerFuer('Maße', stufe)}
            einheit="px"
            wert={entwurf.sonderstufen[stufe]}
            auf={(wert) => aendere({ sonderstufen: { ...entwurf.sonderstufen, [stufe]: wert } })}
          />
          <p className="ml-26 text-[11px] leading-snug text-ui-faint">{STUFENTEXT[stufe]}</p>
        </div>
      ))}

      <p className="pt-2 text-[11px] font-medium text-ui-muted">Laufweite der Auszeichnung</p>
      <Zahlenfeld
        label="enger um"
        anker={ankerFuer('Maße', 'Laufweite der Auszeichnung')}
        einheit="em"
        schritt={0.005}
        wert={entwurf.auszeichnungEnger}
        auf={(auszeichnungEnger) => aendere({ auszeichnungEnger })}
      />
      <p className="text-[11px] leading-snug text-ui-faint">
        Eine Grotesk verträgt in großen Graden mehr Enge als eine Slab-Serif. Null lässt die
        Laufweite der Hierarchie stehen.
      </p>

      <p className="pt-2 text-[11px] font-medium text-ui-muted">Strichstärken</p>
      {strichRollen.map((rolle) => (
        <div key={rolle}>
          <Zahlenfeld
            label={rolle}
            anker={ankerFuer('Maße', rolle)}
            einheit="px"
            schritt={0.5}
            wert={entwurf.stroke[rolle]}
            auf={(wert) => aendere({ stroke: { ...entwurf.stroke, [rolle]: wert } })}
          />
          <p className="ml-26 text-[11px] leading-snug text-ui-faint">{STRICHTEXT[rolle]}</p>
        </div>
      ))}

      <p className="pt-2 text-[11px] font-medium text-ui-muted">Schattenversätze</p>
      {schattenRollen.map((rolle) => (
        <div key={rolle}>
          <Zahlenfeld
            label={rolle}
            anker={ankerFuer('Maße', rolle)}
            einheit="px"
            wert={entwurf.shadowOffset[rolle]}
            auf={(wert) => aendere({ shadowOffset: { ...entwurf.shadowOffset, [rolle]: wert } })}
          />
          <p className="ml-26 text-[11px] leading-snug text-ui-faint">{SCHATTENTEXT[rolle]}</p>
        </div>
      ))}
      <p className="text-[11px] leading-snug text-ui-faint">
        Ein harter Versatz, kein Weichzeichner. Das ist Struktur und keine Einstellung.
      </p>
    </Abschnitt>
  );
}

/* -------------------------------------------------------------------------- */
/* Wortmarke                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Die Wortmarke.
 *
 * Sie ist Pflicht und hat mit Absicht keine Voreinstellung — fehlte sie, trüge
 * ein fremdes Deck die Marke von nozilla. Gefragt wird nach der Datei *und*
 * nach den beiden Füllfarben, die darin stehen: `wordmarkFromSvg()` ordnet über
 * die Farbe zu und nicht über die Reihenfolge der Pfade, weil eine
 * Zeichensoftware Pfade umsortiert, wie sie will.
 */
export function WortmarkeSchritt({ entwurf, aendere }: { entwurf: CiEntwurf; aendere: Aendere }) {
  const marke = entwurf.wortmarke;
  const [klage, setKlage] = useState<string | null>(null);

  const lies = async (eingabe: HTMLInputElement) => {
    const datei = eingabe.files?.[0];
    /*
       Das Feld wird sofort geleert, und zwar unabhängig davon, ob eine Datei
       kam: ohne das meldet ein `<input type="file">` beim zweiten Mal
       dieselbe Datei nicht mehr — `change` feuert nur bei einem *anderen*
       Wert. Wer seine Wortmarke nachbessert und noch einmal auswählt, sah
       deshalb weiter die alte Fassung und hätte den Fehler in seinem
       Zeichenprogramm gesucht.
    */
    eingabe.value = '';
    if (!datei) return;

    /*
       Der Riegel steht **vor** dem Einlesen. Er stand einmal danach, und das
       war fast so schlimm wie gar keiner: der Rohtext lag dann schon im
       Entwurf, und `pruefe()`, `vorschauTheme()` und `designdatei()` fuhren bei
       jedem Anschlag darüber — gemessen 8767 ms je Tastendruck bei 2,9 MB. Die
       Meldung kam, das Formular war trotzdem eingefroren.

       Gemessen wird hier in **Bytes** (`datei.size`) und in der Prüfliste in
       UTF-16-Einheiten (`svg.length`). Die beiden sind nicht dasselbe; die
       Grenze ist beide Male dieselbe Zahl, weil eine Wortmarke aus Pfaddaten
       besteht und die sind ASCII.
    */
    if (datei.size > WORTMARKE_HOECHSTLAENGE) {
      setKlage(
        `„${datei.name}" ist ${Math.round(datei.size / 1024)} kB groß; mehr als ${Math.round(WORTMARKE_HOECHSTLAENGE / 1024)} kB liest dieses Formular nicht. Eine Wortmarke ist ein Schriftzug aus ein paar Pfaden — so viel Inhalt kommt von eingebetteten Bildern oder einem nachgezeichneten Verlauf, und beides landet nicht auf der Folie.`,
      );
      return;
    }

    setKlage(null);
    /*
       Und zwar die Farben *dieser* Datei. Die vorige Fassung behielt mit
       `marke?.letters || gefunden[0]` die der vorigen — wer eine zweite
       Wortmarke wählte, bekam die Zuordnung der ersten, und die Prüfliste
       meldete „kein Pfad in #000000" über eine Datei, in der nie ein Schwarz
       stand.
    */
    aendere({ wortmarke: wortmarkeAusSvg(await datei.text(), datei.name) });
  };

  return (
    <Abschnitt
      titel="Wortmarke"
      hinweis="Als Geometrie, nicht als Bild — nur so landet sie in SVG und PDF als echter Vektor und nimmt die Tinte der Fläche an, auf der sie sitzt."
    >
      <label className="block text-[11px] font-medium text-ui-muted">
        SVG-Datei
        <input
          type="file"
          accept=".svg,image/svg+xml"
          onChange={(event) => void lies(event.currentTarget)}
          className="mt-1 block w-full text-[11px] text-ui-muted file:mr-2 file:h-8 file:rounded-sm file:border file:border-ui file:bg-ui-surface file:px-3 file:text-ui-body file:text-ui-ink"
        />
      </label>

      {klage ? (
        <p
          role="alert"
          className="border border-ui-danger bg-ui-danger-bg px-2 py-1.5 text-[11px] leading-snug text-ui-danger"
        >
          {klage}
        </p>
      ) : null}

      {marke ? (
        <>
          <p className="font-mono text-[11px] text-ui-faint">{marke.dateiname}</p>
          <Textfeld
            label="Füllfarbe der Buchstaben"
            wert={marke.letters}
            auf={(letters) => aendere({ wortmarke: { ...marke, letters } })}
            hinweis="Wie sie in der Datei steht — nicht die Farbe der Marke."
          />
          <Textfeld
            label="Füllfarbe des Akzents"
            wert={marke.accent}
            auf={(accent) => aendere({ wortmarke: { ...marke, accent } })}
            hinweis="Leer lassen, wenn die Marke keinen Akzent am Wortende hat. Gemalt wird er immer in der Signalfarbe."
          />
        </>
      ) : null}
    </Abschnitt>
  );
}

/* -------------------------------------------------------------------------- */
/* Zeichen                                                                     */
/* -------------------------------------------------------------------------- */

export function ZeichenSchritt({ entwurf, aendere }: { entwurf: CiEntwurf; aendere: Aendere }) {
  return (
    <Abschnitt
      titel="Zeichen"
      hinweis="Ein Set ersetzt, es ergänzt nicht. Eigene Zeichen trägt man in der erzeugten Datei nach — sie ersetzen den Katalog dann."
    >
      <Wahlfeld<Zeichenwahl>
        label="Katalog"
        wert={entwurf.zeichen}
        optionen={zeichenwahl.map((wert) => ({ value: wert, label: ZEICHENTEXT[wert] }))}
        auf={(zeichen) => aendere({ zeichen })}
      />
    </Abschnitt>
  );
}
