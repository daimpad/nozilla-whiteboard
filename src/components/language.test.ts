/**
 * Die Oberfläche spricht Deutsch.
 *
 * Sie tat es lange halb: von 154 sichtbaren Zeichenketten waren 46 englisch und
 * 22 deutsch, gemischt im selben Feld — „Search elements" über „Überschrift 1",
 * und einmal sogar beides in einem Satz („Use the Papier tone"). Das ist kein
 * Schönheitsfehler, sondern liest sich wie ein halb fertiger Umbau.
 *
 * Ein Test hält das, was eine Absichtserklärung nicht hält. Geprüft werden die
 * Zeichenketten, die tatsächlich vor Augen kommen: Beschriftungen, Titel,
 * Platzhalter, Hinweise.
 *
 * ## Was ausdrücklich erlaubt bleibt
 *
 * Fachwörter, die auch auf Deutsch so heißen — Markdown, Label, Layout, Badge,
 * Export, Deck, Icon. Sie zu übersetzen machte die Oberfläche nicht deutscher,
 * nur fremder. Und die Schlüssel des Dateiformats: `layout: canvas` steht so in
 * der `.md`, übersetzt wird nur, was daneben angezeigt wird.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
   Gesucht wird in `src`, nicht in `src/components`.

   Die Grenze war bequem und falsch: der Hinweis, der beim Ziehen einer Datei
   über das ganze Fenster liegt, steht in `App.tsx` — also eine Ebene über dem
   Ordner, den das Sieb absuchte. Er blieb englisch, während drinnen jede
   Beschriftung geprüft wurde. Ein Wächter, der nach dem Ort urteilt statt nach
   der Sache, übersieht genau das Auffälligste.

   Gelesen werden nur `.tsx`-Dateien: dort steht, was gezeichnet wird. Die
   `.ts`-Dateien darunter tragen Dateiformat und Rechnung, und deren
   Zeichenketten sind keine Beschriftungen.
*/
const ROOT = join(process.cwd(), 'src');

/**
 * Zwei Siebe, weil es zwei Fälle gibt.
 *
 * **Funktionswörter** verraten einen englischen *Satz*: „the", „with", „your"
 * kommen in deutschen Sätzen nicht vor. Ein Treffer genügt.
 *
 * **Substantive** verraten eine englische *Beschriftung*: „Overview", „Tone",
 * „Width" stehen allein in einem Feld. Hier genügt ein Treffer gerade nicht —
 * „Ein Pfad relativ zum Deck" ist deutsch, obwohl „Deck" darin steht. Erst
 * wenn die ganze Zeichenkette aus solchen Wörtern besteht, ist sie englisch.
 */
const FUNKTIONSWORT =
  /\b(the|and|with|your|you|this|that|these|those|from|into|when|where|which|while|are|is|would|should|click|search|show|hide|add|save|open|close|delete|move|bring|send|align|distribute|inherits|rendered|shown|only|every|whole|current|single|previous|next|exit|pick|place|appears|advance)\b/i;

const SUBSTANTIV = new Set(
  [
    'overview',
    'tone',
    'width',
    'height',
    'opacity',
    'padding',
    'source',
    'variant',
    'background',
    'transition',
    'author',
    'footer',
    'notes',
    'step',
    'style',
    'fill',
    'shape',
    'frame',
    'slide',
    'slides',
    'alt',
    'reveal',
    'weight',
    'line',
    'body',
    // Nachgetragen, weil sie durchgekommen sind: „Nothing selected." und
    // „Embed a file" standen sichtbar im Inspektor, und das Sieb *sah* sie —
    // nur hielt sie das Urteil für harmlos, weil keines ihrer Wörter in einer
    // der beiden Listen stand.
    'nothing',
    'selected',
    'none',
    'embed',
    'file',
    'files',
    'image',
    // Aus dem Sperren-Knopf, der beide Zweige in einem Attribut trug.
    'lock',
    'unlock',
    // Aus `aria-label={`Resize ${handle}`}` an den acht Griffen des
    // Auswahlrahmens — acht englische Ansagen an der meistbenutzten
    // Bedienung der Fläche, und keine davon steht vor Augen: nur eine
    // Hilfstechnik liest sie. Das Sieb *sah* die Zeichenkette und ließ sie
    // durch, weil „resize" ein Verb ist und diese beiden Listen Substantive
    // führen. Gefunden hat es keine Liste, sondern ein Blick in die Datei —
    // dieser Eintrag fängt nur die Wiederholung.
    'resize',
    // Aus dem Hinweis „1280×720 vectors" im Export-Menü — eine Vorlage in
    // einem Attribut, in der nach dem Auflösen genau ein Wort übrig bleibt.
    'vectors',
    'vector',
    'group',
    'ungroup',
  ].map((word) => word.toLowerCase()),
);

/**
 * Fachwörter und Namen, die stehen bleiben. Eine Zeichenkette, die nur aus
 * diesen besteht, ist kein englischer Satz.
 */
const ERLAUBT = new Set(
  [
    'markdown',
    'text',
    'label',
    'labels',
    'layout',
    'badge',
    'export',
    'deck',
    'icon',
    'icons',
    'element',
    'lead',
    'headline',
    'prompt',
    'canvas',
    'svg',
    'pdf',
    'powerpoint',
    'pptx',
    'md',
    'chevron',
    'banner',
    'code',
    'nozilla',
    'ci',
    'esc',
    'system',
    // „a" verurteilt für sich genommen nichts — es rettet aber auch nichts.
    // Ohne diesen Eintrag entkam „Embed a file", weil der unbestimmte Artikel
    // in keiner Liste stand und die Bedingung „jedes Wort" damit scheiterte.
    // Als Funktionswort wäre es zu scharf: es käme ein „Variante a" vor.
    'a',
  ].map((word) => word.toLowerCase()),
);

/**
 * Wörter, die ihre Sprache in der Endung tragen.
 *
 * Der Grund für diese Regel ist die Bauart der beiden Listen darüber: sie sind
 * **Verbotslisten**. Was nicht darin steht, kommt durch — und dreimal ist genau
 * das passiert. Zuletzt standen „· unsaved" in der Titelzeile (sichtbar,
 * solange nicht gesichert ist: die meiste Zeit), „(embedded image)" im
 * Inspektor bei jedem eingebetteten Bild und „Saving…" während des Speicherns.
 * Kein Wort davon stand in einer Liste, und keines wäre je hineingekommen,
 * ohne dass jemand den Fehler erst gemacht hätte.
 *
 * Eine Endung ist kein Wort, sondern eine Form — und sie fängt auch das, was
 * noch niemand geschrieben hat. `-tion` und `-ment` stehen bewusst **nicht**
 * dabei: „Position", „Präsentation", „Dokument", „Element" sind deutsch, und
 * eine Regel, die die halbe Oberfläche verurteilt, wird nach einer Woche
 * abgeschaltet.
 *
 * Und der Unterschied, auf den es ankommt: irrt sich diese Regel, wird der Test
 * an deutschem Text **rot** — laut, sofort, mit der Stelle daneben. Irrt sich
 * eine Verbotsliste, bleibt sie grün und der englische Satz steht im Fenster.
 */
const ENGLISCHE_ENDUNG = /^[a-z]{2,}(ed|ing|ness|able|ible|ously)$/;

/**
 * Deutsche Wörter, die zufällig so enden.
 *
 * Kurz, und das ist der Punkt: was hier fehlt, macht sich beim nächsten
 * `npm run test` bemerkbar, nicht beim nächsten Benutzer.
 */
const TROTZDEM_DEUTSCH = new Set([
  'lied',
  'glied',
  'mitglied',
  'abschied',
  'ring',
  'ding',
  'training',
  'meeting',
  'marketing',
  'timing',
  'rendering',
  'layouting',
]);

/**
 * Sieht die Zeichenkette aus wie Klempnerei statt wie eine Beschriftung?
 *
 * Klassennamen, Schlüssel des Dateiformats, Zeichennamen, MIME-Typen: alles
 * durchgehend klein, mit Bindestrichen, Schrägstrichen und Klammern. Eine
 * deutsche Beschriftung sieht anders aus, und zwar aus einem Grund, der der
 * Sprache selbst gehört — **deutsche Substantive werden großgeschrieben.** Ein
 * sichtbarer Text ohne einen einzigen Großbuchstaben ist hier so gut wie immer
 * keiner.
 */
function istKlempnerei(text: string): boolean {
  return /^[a-z0-9:\-/[\]. %]+$/.test(text);
}

/**
 * Alle `.tsx` unter `src` — außer den Prüfdateien.
 *
 * Eine `*.test.tsx` wird nie gezeichnet: was darin steht, sieht niemand außer
 * dem, der sie liest. Aufgefallen ist das an `taste({ key: 'Delete' })` in der
 * Prüfung der Tastatur — der DOM-Name einer Taste, den dieses Sieb für eine
 * englische Beschriftung hielt. Der Filter `istKlempnerei` fängt ihn nicht,
 * weil er großgeschrieben ist.
 */
function quellen(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return quellen(path);
    return path.endsWith('.tsx') && !path.endsWith('.test.tsx') ? [path] : [];
  });
}

/**
 * Heraus, was niemand sieht.
 *
 * Kommentare zuerst — der Code ist auf Deutsch kommentiert, das zählt nicht.
 * Und die Ausnahmen: `new Error('Root container #root is missing')` steht für
 * den, der die Konsole aufmacht, nicht für den, der eine Folie baut. Sie
 * deutsch zu verlangen hieße, das Sieb an einer Stelle scharf zu stellen, an
 * der es nichts zu bewachen gibt.
 */
function nurOberflaeche(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/new Error\([\s\S]*?\)/g, '');
}

/**
 * Die Zeichenketten-Literale einer Quelle, in ihrer Reihenfolge.
 *
 * Von links nach rechts, jedes Literal ganz verbraucht. Ein Muster wie
 * `/'([^']{4,120})'/` tut das *nicht*: es darf mitten in der Quelle anfangen
 * und nimmt dann das schließende Zeichen des einen Literals als öffnendes des
 * nächsten. Auf einer Zeile mit einer leeren Zeichenkette kippt damit die
 * Parität, und das Sieb meldet den Code *zwischen* zwei Literalen als
 * Beschriftung.
 */
function literale(source: string): string[] {
  const muster = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
  return [...source.matchAll(muster)].map((treffer) => treffer[0]);
}

/**
 * Was der Mensch sieht — und zwar auf vier Wegen, weil eine Beschriftung auf
 * vier Weisen im Code stehen kann.
 *
 * Das Sieb kannte lange nur die ersten anderthalb. Es war grün, während die
 * ganze Vortragsansicht englisch blieb: „→ / Space advance · ← back", „Notes ·"
 * und „No notes for this slide." Keine dieser drei ist ein Attribut, und keine
 * ist ein reiner Textknoten. Ein Wächter, der nur die bequemen Fälle prüft,
 * bewacht den Eingang und lässt die Hintertür offen.
 */
function sichtbareTexte(source: string): string[] {
  const out: string[] = [];
  /** Texte, die zwischen zwei Ausdrücken stehen — siehe unten, Punkt 3b. */
  const ausTextknoten: string[] = [];

  // 1 · Als Attribut: label="…" oder label={'…'}.
  for (const match of source.matchAll(
    /(?:label|title|placeholder|aria-label|hint|alt)=(?:"([^"]{2,})"|\{'([^']{2,})'\})/g,
  )) {
    out.push(match[1] ?? match[2]);
  }

  // 1c · Als Vorlage in einem Attribut: hint={`… vectors`}. Das Satz-Sieb
  // unten sieht sie zwar, aber nach dem Auflösen der Platzhalter bleibt oft
  // nur ein Wort übrig — und ein Wort allein wertet es nicht.
  for (const match of source.matchAll(
    /(?:label|title|placeholder|aria-label|hint|alt)=\{`([^`]{2,200})`\}/g,
  )) {
    out.push(match[1].replace(/\$\{[^}]*\}/g, ' '));
  }

  // 1c · Deutsche Prop-Namen. `Abschnitt titel="…"` und `hinweis="…"` sind
  // die Beschriftungen des CI-Generators; ohne sie hier stünde ein ganzer
  // Bautyp wieder außerhalb des Siebs — genau der Fehler, wegen dem `label:`
  // als Objekt-Eigenschaft nachgetragen werden musste.
  for (const match of source.matchAll(/(?:titel|hinweis|platzhalter)="([^"\n]{2,200})"/g)) {
    out.push(match[1]);
  }

  // 1b · Als Attribut, dessen Wert ein Ausdruck ist:
  // `label={gesperrt ? 'Entsperren' : 'Sperren'}`. Beide Zweige stehen vor
  // Augen, und beide entkamen: der Ausdruck oben verlangt genau `{'…'}`, und
  // das Satz-Sieb unten wertet nur, was zwei Wörter hat.
  for (const match of source.matchAll(
    /(?:label|title|placeholder|aria-label|hint|alt|titel|hinweis|platzhalter)=\{([^}]{2,200})\}/g,
  )) {
    for (const teil of match[1].matchAll(/'([^'\n]{2,120})'|"([^"\n]{2,120})"/g)) {
      out.push(teil[1] ?? teil[2]);
    }
  }

  // 2 · Als Eigenschaft eines Objekts: `{ value: 'fit', label: 'Passend' }`.
  // So ist jede Beschriftung eines `Segmented` geschrieben — ein ganzer
  // Bautyp, den das Sieb nie zu Gesicht bekam.
  for (const match of source.matchAll(
    /\b(?:label|title|placeholder|hint|alt|titel|hinweis|platzhalter):\s*(?:'([^']{2,})'|"([^"]{2,})")/g,
  )) {
    out.push(match[1] ?? match[2]);
  }

  // 3 · Als Textknoten. Er endet nicht nur an `<`, sondern auch an `{`: in
  // „Notizen · {slideTitle(…)}" steht das deutsche Wort vor einem Ausdruck.
  // Und er fängt nicht immer mit einem Buchstaben an — die Hilfszeile beginnt
  // mit einem Pfeil.
  /*
     Hinter `>` **oder** hinter `}`: ein Textknoten fängt nicht immer an einem
     Element an. „{deck.slides.length} slide{…}" stand so in der Übersicht —
     sichtbarer englischer Text in einem Bereich, den ⌘K aus dem Editor und aus
     dem Vortrag öffnet —, und das Sieb war grün, weil der Text hinter einer
     geschweiften Klammer begann. Genau die Schreibweise, in der eine Zahl mit
     ihrem Wort steht.
  */
  for (const match of source.matchAll(/>\s*([^<>{}\n][^<>{}\n]{3,90})\s*[<{]/g)) {
    if (/^[)\]}]/.test(match[1])) continue;
    if (/[A-Za-zÄÖÜäöü]/.test(match[1])) out.push(match[1]);
  }

  /*
     Und hinter einer schließenden geschweiften Klammer — **auf derselben
     Zeile**. „{deck.slides.length} slide{…}" stand so in der Übersicht,
     sichtbarer englischer Text, und das Sieb war grün: sein Muster verlangte
     einen Textknoten *hinter einem Element*. Genau in dieser Schreibweise
     steht eine Zahl mit ihrem Wort.

     Die Zeilenbindung ist der Unterschied zwischen einem Wächter und einem
     Ärgernis: über Zeilen hinweg gelesen wäre jedes `}` am Ende eines
     Ausdrucks der Anfang eines „Textknotens", und vierzig Zeilen Code
     (`aria-selected=`, `case 'move':`) stünden als Beschriftung da.
  */
  for (const match of source.matchAll(/\}[ \t]*([^<>{}\n][^<>{}\n]{2,90})[ \t]*[<{]/g)) {
    if (/^[)\]}]/.test(match[1])) continue;
    // Was auf `=` endet, ist der Name eines Attributs und keine Beschriftung:
    // `<Icon width={64} fill={…} />` steht zwischen zwei Ausdrücken genau so
    // da wie ein Textknoten.
    if (/=$/.test(match[1].trim())) continue;
    /*
       Diese Fundstellen gehen **am Klempnerei-Filter vorbei**, und das ist der
       Punkt. „slide" ist durchgehend klein und sähe wie ein Klassenname aus —
       genau deshalb kam es durch. Ein Text, der im JSX *zwischen* zwei
       Ausdrücken steht, ist aber keine Klempnerei, sondern per Bauart
       sichtbar. Was hier hereinkommt, ist durch die Zeilenbindung und den
       `=`-Filter schon eng gefasst; gemessen bleibt kein Codeschnipsel übrig.
    */
    if (/[A-Za-zÄÖÜäöü]/.test(match[1])) ausTextknoten.push(match[1]);
  }

  /*
     4 und 5 · Als Zeichenkette in einem Ausdruck — `{… || 'No notes …'}`,
     `setBusy('Saving')`. Beide lesen dieselben Literale, und deshalb werden
     sie **einmal getrennt und nicht zweimal gesucht**.

     Der Grund ist ein Fehler, den die vorige Fassung machte: sie suchte mit
     `/'([^'\n]{4,120})'/` und paarte die Anführungszeichen damit falsch. In
     `{ family: '', weight: 400, style: 'normal' }` nahm sie das *schließende*
     Zeichen der leeren Zeichenkette als öffnendes und meldete
     „, weight: 400, style: " als englische Beschriftung. Ein Sieb, das
     Klempnerei als Text ausgibt, wird abgeschaltet und bewacht dann gar nichts
     mehr — genau davor warnt der Kopf dieser Datei.

     `literale()` liest von links nach rechts und verbraucht jedes Literal
     ganz; das nächste beginnt garantiert hinter dem vorigen.
  */
  for (const roh of literale(source)) {
    const text = roh.slice(1, -1).replace(/\$\{[^}]*\}/g, ' ');
    // Ein *Satz*: mindestens zwei durch Leerzeichen getrennte Wörter.
    if (text.length >= 4 && /\S\s+\S/.test(text) && /[A-Za-zÄÖÜäöü]/.test(text)) {
      out.push(text);
      continue;
    }
    // Ein *einzelnes* Wort. Die Zeile darüber verlangt zwei, und aus gutem
    // Grund — sonst geriete jeder Klassenname ins Sieb. „Saving…" stand
    // deshalb monatelang sichtbar über der Leiste, während der Wächter grün
    // war. Was Klempnerei ist, wird an der Schreibweise erkannt und nicht an
    // der Wortzahl.
    if (/^[A-Za-zÄÖÜäöü][^\n]{2,40}$/.test(text)) out.push(text);
  }

  // Klempnerei fällt hier heraus und nicht erst im Urteil: eine Liste von
  // Tailwind-Klassen ist voller `rounded`, `dashed`, `leading` und `tracking`,
  // und die Regel nach der Wortform verurteilte sie reihenweise. Sie steht
  // aber nicht vor Augen — sie *macht* das, was vor Augen steht.
  return [
    ...out.map((text) => text.trim()).filter((text) => text && !istKlempnerei(text)),
    ...ausTextknoten.map((text) => text.trim()).filter(Boolean),
  ];
}

function istEnglisch(text: string): boolean {
  // Zeichenketten mit Umlauten oder ß sind deutsch, fertig.
  if (/[äöüßÄÖÜ]/.test(text)) return false;
  const woerter = text.toLowerCase().match(/[a-z]+/g) ?? [];
  if (woerter.length === 0) return false;
  if (woerter.every((word) => ERLAUBT.has(word))) return false;
  if (FUNKTIONSWORT.test(text)) return true;
  // Nach der Form, nicht nach der Liste — siehe `ENGLISCHE_ENDUNG`.
  if (woerter.some((word) => ENGLISCHE_ENDUNG.test(word) && !TROTZDEM_DEUTSCH.has(word))) {
    return true;
  }
  // Eine Beschriftung ganz aus englischen Substantiven — „Line weight", „Alt
  // text". Fachwörter dürfen dabeistehen, sie entscheiden nichts.
  return woerter.every((word) => SUBSTANTIV.has(word) || ERLAUBT.has(word));
}

describe('die Oberfläche spricht Deutsch', () => {
  it('trägt keine englischen Beschriftungen', () => {
    const treffer: string[] = [];
    for (const file of quellen(ROOT)) {
      const name = file.split('/').pop() ?? '';
      for (const text of sichtbareTexte(nurOberflaeche(readFileSync(file, 'utf8')))) {
        if (istEnglisch(text)) treffer.push(`${name}: ${text}`);
      }
    }
    expect(treffer).toEqual([]);
  });

  it('erkennt einen englischen Satz, wenn einer käme', () => {
    // Der Test über dem Test: ein Sieb, das nichts fängt, ist grün und nutzlos.
    expect(istEnglisch('Click to place at the centre of the slide.')).toBe(true);
    expect(istEnglisch('Hide footer and slide number')).toBe(true);
    expect(istEnglisch('Fußzeile und Foliennummer ausblenden')).toBe(false);
    expect(istEnglisch('Overview')).toBe(true);
    expect(istEnglisch('Line weight')).toBe(true);
    expect(istEnglisch('Markdown')).toBe(false);
    expect(istEnglisch('Prompt')).toBe(false);
    // Deutsche Sätze, in denen ein Fachwort steckt, bleiben deutsch.
    expect(istEnglisch('Ein Pfad relativ zum Deck oder eine data-URI.')).toBe(false);
    expect(istEnglisch('SVG — ganzes Deck')).toBe(false);
    // „was" und „will" sind deutsche Wörter — das Sieb darf nicht darauf
    // hereinfallen.
    expect(istEnglisch('Was soll passieren, wenn das Deck durch ist?')).toBe(false);
    expect(istEnglisch('Text')).toBe(false);
    // Die zwei, die das Urteil durchließ, obwohl das Sieb sie hatte.
    expect(istEnglisch('Nothing selected.')).toBe(true);
    expect(istEnglisch('Embed a file')).toBe(true);
    // Und die zwei aus dem Sperren-Knopf, die als Zweige eines Ausdrucks in
    // einem Attribut standen.
    expect(istEnglisch('Lock')).toBe(true);
    expect(istEnglisch('Unlock')).toBe(true);
    expect(istEnglisch(' × vectors')).toBe(true);
    expect(istEnglisch(' × , echte Pfade')).toBe(false);
    // Und die deutschen Beschriftungen daneben bleiben deutsch.
    expect(istEnglisch('Nichts ausgewählt.')).toBe(false);
    expect(istEnglisch('Datei einbetten')).toBe(false);
    expect(istEnglisch('Eine Seite')).toBe(false);
    expect(istEnglisch('Ziel danach')).toBe(false);
    expect(istEnglisch('Prompt ·')).toBe(false);

    /*
       Und die sechs, die eine Verbotsliste nicht fangen konnte, weil keines
       ihrer Wörter darin stand. Sie standen alle sichtbar da — „· nicht
       gesichert" die meiste Zeit, „Saving…" bei jedem Speichern, der
       Platzhalter in jedem leeren Markdown-Feld.
    */
    expect(istEnglisch('· unsaved')).toBe(true);
    expect(istEnglisch('(embedded image)')).toBe(true);
    expect(istEnglisch('Saving')).toBe(true);
    expect(istEnglisch('# Heading\n\n- A point\n- Another point')).toBe(true);
    expect(istEnglisch(' — not installed')).toBe(true);
    expect(istEnglisch('Dashed')).toBe(true);
    // Und was an ihre Stelle getreten ist, bleibt deutsch.
    expect(istEnglisch('· nicht gesichert')).toBe(false);
    expect(istEnglisch('(eingebettetes Bild)')).toBe(false);
    expect(istEnglisch('Sichere')).toBe(false);
    expect(istEnglisch(' — nicht installiert')).toBe(false);
    expect(istEnglisch('Gestrichelt')).toBe(false);
  });

  it('hält deutsche Wörter mit englischer Endung aus', () => {
    /*
       Die Gegenrichtung der Regel nach der Wortform, und die entscheidet, ob
       sie überlebt: ein Wächter, der reihenweise deutschen Text verurteilt,
       wird nach einer Woche abgeschaltet — und dann bewacht er gar nichts
       mehr. Deshalb keine Endungen auf `-tion` und `-ment`.
    */
    expect(istEnglisch('Position auf der Folie')).toBe(false);
    expect(istEnglisch('Dokument und Element')).toBe(false);
    expect(istEnglisch('Präsentation beenden')).toBe(false);
    expect(istEnglisch('Mitglied der Gruppe')).toBe(false);
    expect(istEnglisch('Training')).toBe(false);
  });

  it('hält eine Liste von Klassen nicht für eine Beschriftung', () => {
    /*
       Der erste Anlauf der Regel nach der Wortform verurteilte dreißig
       Tailwind-Klassenlisten: `rounded`, `dashed`, `leading` und `tracking`
       enden alle so. Sie stehen nicht vor Augen — sie machen das, was vor
       Augen steht. Erkannt werden sie an der Schreibweise: durchgehend klein,
       mit Bindestrichen. Eine deutsche Beschriftung sieht anders aus, denn
       deutsche Substantive werden großgeschrieben.
    */
    const quelle = [
      "<div className='flex items-center rounded-sm border-dashed leading-snug' />",
      "<div className='mt-1.5 text-[11px] tracking-wide bg-ui-surface/85' />",
      '<p>Eine gestrichelte Linie</p>',
    ].join('\n');

    const gefunden = sichtbareTexte(quelle);
    expect(gefunden.filter((text) => istEnglisch(text))).toEqual([]);
    // Aber der sichtbare Satz daneben wird sehr wohl gesehen.
    expect(gefunden).toContain('Eine gestrichelte Linie');
  });

  it('findet eine Beschriftung in allen vier Schreibweisen', () => {
    // Das Sieb *vor* dem Urteil. `istEnglisch` war nie das Problem — die drei
    // Zeichenketten der Vortragsansicht kamen bei ihm nie an. Jede Zeile hier
    // steht für eine Schreibweise, die einmal durchgerutscht ist.
    const quelle = [
      '<IconButton label="Als Attribut" />',
      "const opts = [{ value: 'fit', label: 'Als Eigenschaft' }];",
      '<h3>Als Textknoten vor einem Ausdruck · {titel(folie)}</h3>',
      '<p>→ / Auch wenn ein Pfeil davorsteht</p>',
      "<p>{notiz || 'Als Rückfall in einem Ausdruck.'}</p>",
      "<p>{kopiert ? 'Erster Zweig hier' : 'Zweiter Zweig hier'}</p>",
      '<Field hint={`Als Vorlage mit ${wert} darin.`} />',
      "<IconButton label={gesperrt ? 'Erster Zweig im Attribut' : 'Zweiter Zweig im Attribut'} />",
    ].join('\n');

    const gefunden = sichtbareTexte(quelle);
    for (const erwartet of [
      'Als Attribut',
      'Als Eigenschaft',
      'Als Textknoten vor einem Ausdruck ·',
      '→ / Auch wenn ein Pfeil davorsteht',
      'Als Rückfall in einem Ausdruck.',
      'Erster Zweig hier',
      'Zweiter Zweig hier',
      'Erster Zweig im Attribut',
      'Zweiter Zweig im Attribut',
    ]) {
      expect(gefunden, erwartet).toContain(erwartet);
    }
    expect(gefunden.some((text) => text.startsWith('Als Vorlage mit'))).toBe(true);
  });

  it('lässt Klassennamen und Schlüssel in Ruhe', () => {
    // Das vierte Sieb sieht *jede* Zeichenkette an. Ohne die Bedingung „zwei
    // durch Leerzeichen getrennte Wörter" fiele jeder Klassenstapel hinein —
    // und `body` steht in der Substantivliste, also gälte `text-body` als
    // englische Beschriftung.
    const quelle = [
      "cx('flex items-end justify-between p-4', 'text-ui-body')",
      "document.querySelector('body')",
      "if (mode === 'slide') return null;",
    ].join('\n');

    for (const text of sichtbareTexte(quelle)) {
      expect(istEnglisch(text), text).toBe(false);
    }
  });
});
