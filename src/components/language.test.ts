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

function quellen(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return quellen(path);
    return path.endsWith('.tsx') ? [path] : [];
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

  // 1b · Als Attribut, dessen Wert ein Ausdruck ist:
  // `label={gesperrt ? 'Entsperren' : 'Sperren'}`. Beide Zweige stehen vor
  // Augen, und beide entkamen: der Ausdruck oben verlangt genau `{'…'}`, und
  // das Satz-Sieb unten wertet nur, was zwei Wörter hat.
  for (const match of source.matchAll(
    /(?:label|title|placeholder|aria-label|hint|alt)=\{([^}]{2,200})\}/g,
  )) {
    for (const teil of match[1].matchAll(/'([^'\n]{2,120})'|"([^"\n]{2,120})"/g)) {
      out.push(teil[1] ?? teil[2]);
    }
  }

  // 2 · Als Eigenschaft eines Objekts: `{ value: 'fit', label: 'Passend' }`.
  // So ist jede Beschriftung eines `Segmented` geschrieben — ein ganzer
  // Bautyp, den das Sieb nie zu Gesicht bekam.
  for (const match of source.matchAll(
    /\b(?:label|title|placeholder|hint|alt):\s*(?:'([^']{2,})'|"([^"]{2,})")/g,
  )) {
    out.push(match[1] ?? match[2]);
  }

  // 3 · Als Textknoten. Er endet nicht nur an `<`, sondern auch an `{`: in
  // „Notizen · {slideTitle(…)}" steht das deutsche Wort vor einem Ausdruck.
  // Und er fängt nicht immer mit einem Buchstaben an — die Hilfszeile beginnt
  // mit einem Pfeil.
  for (const match of source.matchAll(/>\s*([^<>{}\n][^<>{}\n]{3,90})\s*[<{]/g)) {
    // Kein Textknoten fängt mit einer schließenden Klammer an — wohl aber die
    // Rückgabe einer Funktion hinter einem generischen Typ:
    // `Array<string | false>): string {`. Das `>` gehört dort der Klammer und
    // nicht einem Element, und „string" endet auf `-ing`.
    if (/^[)\]}]/.test(match[1])) continue;
    if (/[A-Za-zÄÖÜäöü]/.test(match[1])) out.push(match[1]);
  }

  // 4 · Als Zeichenkette in einem Ausdruck: `{… || 'No notes for this slide.'}`
  // oder `{copied ? 'Kopiert' : 'Kopieren'}`. Hier wird nur gewertet, was wie
  // ein *Satz* aussieht — mindestens zwei durch Leerzeichen getrennte Wörter.
  // Sonst geriete jeder Klassenname und jeder Schlüssel ins Sieb.
  for (const match of source.matchAll(/'([^'\n]{4,120})'|"([^"\n]{4,120})"|`([^`\n]{4,120})`/g)) {
    const text = (match[1] ?? match[2] ?? match[3]).replace(/\$\{[^}]*\}/g, ' ');
    if (/\S\s+\S/.test(text) && /[A-Za-zÄÖÜäöü]/.test(text)) out.push(text);
  }

  // 5 · Als *einzelnes* Wort in einem Ausdruck: `setBusy('Saving')`. Die
  // Zeile darüber verlangt zwei Wörter, und aus gutem Grund — sonst geriete
  // jeder Klassenname ins Sieb. „Saving…" stand deshalb monatelang sichtbar
  // über der Leiste, während der Wächter grün war. Was Klempnerei ist, wird
  // hier an der Schreibweise erkannt und nicht an der Wortzahl.
  for (const match of source.matchAll(/'([A-Za-zÄÖÜäöü][^'\n]{2,40})'/g)) {
    out.push(match[1]);
  }

  // Klempnerei fällt hier heraus und nicht erst im Urteil: eine Liste von
  // Tailwind-Klassen ist voller `rounded`, `dashed`, `leading` und `tracking`,
  // und die Regel nach der Wortform verurteilte sie reihenweise. Sie steht
  // aber nicht vor Augen — sie *macht* das, was vor Augen steht.
  return out
    .map((text) => text.trim())
    .filter(Boolean)
    .filter((text) => !istKlempnerei(text));
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
