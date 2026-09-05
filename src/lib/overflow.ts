/**
 * Wenn der Inhalt aus seinem Kasten läuft.
 *
 * ## Warum es das gibt
 *
 * Nichts merkte das. Zweimal ist es passiert, und beide Male hat es niemand
 * gemeldet — gesehen habe ich es im Bild:
 *
 *   • Die Überschrift des Musterkunden lief aus ihrem Kasten, weil Inter
 *     breiter läuft als Zilla Slab. Der Test war grün, das Modell auch.
 *   • Eine Karte im Probenhaus saß mit der letzten Zeile auf der Unterkante.
 *
 * Das Werkzeug verspricht: *was du legst, ist das, was du lieferst.* Ein
 * Überlauf bricht dieses Versprechen still — auf dem Bildschirm sieht man die
 * Zeile noch, im PDF steht sie über dem Rand, und im PPTX schneidet
 * PowerPoint sie ab.
 *
 * ## Warum am Gezeichneten gemessen wird
 *
 * Jeder Baustein setzt anders: eine Karte stapelt Label, Titel und Text, ein
 * Textelement setzt einen Block, ein Markdown-Element rechnet mit Aufzählungen
 * und Codeblöcken. Diese Rechnungen hier nachzubauen hieße, sie zweimal zu
 * haben — und die zweite liefe irgendwann auseinander.
 *
 * Stattdessen wird gefragt, was tatsächlich auf der Folie landet:
 * `buildElementPrims()` liefert die Primitive, und deren Unterkante verrät
 * alles. Das ist dieselbe Regel wie beim Prüfen — gegen das Ergebnis, nicht
 * gegen den Erzeuger.
 */
import { buildElementPrims, type ScenePrim } from '@/lib/export/scene';
import { bildmass, bildmasseVersion } from '@/lib/export/images';
import { flowBounds, flowFrame } from '@/lib/layout/slideLayout';
import { fontsVersion } from '@/theme/fonts';
import { canvas, themeVersion } from '@/theme';
import type { CanvasElement, Slide } from '@/model/types';

/**
 * Wie weit etwas unten hinausstehen darf, ohne dass es jemanden kümmert.
 *
 * Unterlängen, Schattenversätze und die Rundung des Setzers bewegen sich in
 * dieser Größenordnung. Wer hier zu streng ist, malt die halbe Folie an.
 */
const NACHSICHT = 2;

/**
 * Gemerkt, was schon gerechnet wurde.
 *
 * Die Fläche fragt für *jedes* Element bei *jedem* Bild — und die Antwort
 * kostet einen vollen Satz durch den Setzer. Beim Ziehen wäre das der zweite
 * nach dem Zeichnen.
 *
 * Der Schlüssel ist das Element selbst, nicht seine Kennung: der Store gibt
 * unveränderten Elementen dasselbe Objekt zurück und legt nur für die
 * geänderten ein neues an. Beim Ziehen rechnet damit genau eines neu. Eine
 * `WeakMap` hält nichts am Leben — wird ein Element gelöscht, geht sein
 * Eintrag mit.
 */
let gemerkt = new WeakMap<CanvasElement, number>();

/**
 * Woran der gemerkte Wert hängt — außer am Element selbst.
 *
 * Drei Dinge ändern das Maß, ohne das Element anzufassen: eine andere Schrift
 * (die echte kommt erst nach dem ersten Zeichnen an), ein anderes
 * Erscheinungsbild (andere Typo-Leiter) und eingetroffene Bildmaße. Ohne
 * diesen Stand hielt die `WeakMap` ihren Wert für die Lebenszeit des Objekts.
 *
 * Gemessen an einer Überschrift in einem 300 × 60-Kasten: unter nozilla 417
 * Einheiten Überlauf, nach dem Wechsel auf ein anderes Erscheinungsbild sind
 * es 307 — der Merker sagte weiter 417. `resetMeasurementCache()` räumt bei
 * genau diesen Anlässen den Messpuffer; zwei Merker für dieselbe Frage, und
 * nur einer verfiel.
 */
function stand(): string {
  return `${themeVersion()}|${fontsVersion()}|${bildmasseVersion()}`;
}

let gemerkterStand = stand();

/**
 * Um wie viele Einheiten der Inhalt unten aus dem Kasten läuft — oder `0`.
 *
 * Nur nach unten: Text wächst nach unten, und ein Kasten, der oben übersteht,
 * ist eine Absicht (ein Zeichen, das über den Rand ragt) und kein Unfall.
 */
export function overflowOf(element: CanvasElement): number {
  const jetzt = stand();
  if (jetzt !== gemerkterStand) {
    gemerkterStand = jetzt;
    gemerkt = new WeakMap();
  }

  const bekannt = gemerkt.get(element);
  if (bekannt !== undefined) return bekannt;

  const wert = rechne(element);
  gemerkt.set(element, wert);
  return wert;
}

/**
 * Um wie viel der **Fließtext** einer Folie unter den Satzspiegel läuft.
 *
 * Der Wächter daneben kennt nur Elemente — und damit ausgerechnet den Inhalt
 * nicht, den jede Folie hat. Gemessen an vierzig Absätzen im
 * `default`-Layout: der Satz endet 831 Einheiten unter der Folienkante, in
 * jeder Ausgabe, ohne ein Wort. Auf dem Bildschirm schneidet ihn der
 * Folienrand ab, im PDF steht er auf keiner Seite.
 *
 * Gemessen wird gegen den **Satzspiegel** und nicht gegen die Folienkante:
 * darunter sitzt die Fußzeile, und ein Fließtext, der in sie hineinläuft, ist
 * schon falsch gesetzt. Kein einziger Fließtext der mitgelieferten Decks
 * kommt dem Satzspiegel näher als zwanzig Einheiten — ein Wächter, der auf
 * dem eigenen Material anschlägt, wird abgeschaltet.
 */
export function flussUeberlauf(slide: Slide): number {
  const frame = flowFrame(slide.meta.layout);
  const unten = flussUnterkante(slide);
  if (!frame || unten === null) return 0;

  const ueber = unten - (frame.y + frame.h);
  return ueber > NACHSICHT ? Math.round(ueber) : 0;
}

/**
 * Und wie viel davon unter der Folienkante liegt.
 *
 * Zwei Fragen und nicht eine: zwischen Satzspiegel und Folienkante steht der
 * Text noch da (und in der Fußzeile), darunter steht er in keiner Ausgabe. Ein
 * Satz, der beides gleichsetzt, ist an einer der beiden Stellen falsch —
 * dieselbe Rechnung, zwei Auskünfte.
 */
export function unterDerFolienkante(slide: Slide): number {
  const unten = flussUnterkante(slide);
  if (unten === null) return 0;
  const ueber = unten - canvas.height;
  return ueber > NACHSICHT ? Math.round(ueber) : 0;
}

function flussUnterkante(slide: Slide): number | null {
  const kasten = flowBounds(slide.meta.layout, slide.markdown, bildmass);
  return kasten ? kasten.y + kasten.h : null;
}

function rechne(element: CanvasElement): number {
  // Ein Bild wird eingepasst, eine Linie hat keinen Inhalt — dort wäre die
  // Frage sinnlos.
  if (element.kind === 'image' || element.kind === 'connector') return 0;

  /*
     Gemessen wird im **Kasten des Elements**, also ohne seine Drehung.

     `elementMatrix()` dreht um die Elementmitte, verglichen wurde aber gegen
     die Unterkante des *ungedrehten* Kastens. Beides zusammen ging in beide
     Richtungen schief: ein Satz, der bequem in seinen Kasten passt, meldete
     bei 270° einen Überlauf von 144 Einheiten, und schon bei 15° wanderte ein
     wirklicher Überlauf von 46 Einheiten aus der Rechnung heraus und blieb
     unsichtbar. Ein Wächter, der auf gut Aussehendem anschlägt und beim
     Fehler schweigt, ist beides zugleich falsch.

     Die Frage ändert sich durch eine Drehung ja nicht: Kasten und Inhalt
     drehen sich gemeinsam, und ob der Text unten hinausragt, entscheidet sich
     im Kasten.
  */
  const gerade = element.rotation ? ({ ...element, rotation: 0 } as CanvasElement) : element;
  /*
     Mit den Bildmaßen gerechnet, wie die Fläche zeichnet.

     Ohne sie fällt der Setzer auf „volle Spaltenbreite, Verhältnis 0,5625"
     zurück — das ist die Falle „Die Fläche maß Markdown-Bilder anders als der
     Export", und ein Wächter, der ein anderes Bild misst als das gezeichnete,
     meldet den Überlauf eines Bildes, das so nirgends steht.
  */
  const unten = untersteKante(buildElementPrims(gerade, undefined, { resolveImageSize: bildmass }));
  if (unten === null) return 0;

  const ueber = unten - (gerade.y + gerade.h);
  return ueber > NACHSICHT ? Math.round(ueber) : 0;
}

/**
 * Die unterste Kante dessen, was der Setzer gesetzt hat.
 *
 * **Text und Bild.** Der erste Versuch maß alles Gezeichnete und schlug bei jeder
 * Karte an — der harte Versatzschatten der CI liegt absichtlich außerhalb des
 * Kastens, und eine Anzeige, die bei jedem Element aufleuchtet, ist so nutzlos
 * wie gar keine.
 *
 * Es ist auch das Richtige: Flächen, Rahmen und Zeichen werden aus dem Kasten
 * des Elements heraus gezeichnet und können ihn nicht überlaufen. Nur was der
 * Setzer setzt, weiß vorher nicht, wie hoch es wird. Ein Codeblock in einem
 * Markdown-Element bringt zwar eine eigene Fläche mit, aber darin steht Text —
 * der reicht ohnehin tiefer als sein Kasten hoch ist.
 *
 * **Ein Bild zählt mit, und das fehlte.** Ein Markdown-Element, dessen Inhalt
 * eine Abbildung ist, setzt gar keinen Text: `untersteKante` fand nichts und
 * gab `null` zurück, der Überlauf war 0. Gemessen an `![](logo.png)` in einem
 * 400 × 80-Kasten: das Bild endet 145 Einheiten unter der Unterkante, und
 * gemeldet wurde nichts. Ein Bild*element* bleibt außen vor — das wird
 * eingepasst —, ein Bild *im Fließtext* nicht: der Setzer gibt ihm die volle
 * Spaltenbreite und sein eigenes Verhältnis.
 *
 * Ein Textprimitiv nennt seine Grundlinie, nicht seinen Kasten. Die Unterlänge
 * darunter wird aus der Schriftgröße geschätzt: genauer ginge nur mit einem
 * zweiten Weg durch die Schriftmaße, und für „läuft es über?" ist ein Viertel
 * der Größe nah genug.
 */
function untersteKante(prims: readonly ScenePrim[]): number | null {
  let unten: number | null = null;
  const tiefer = (kante: number) => {
    unten = unten === null ? kante : Math.max(unten, kante);
  };
  for (const prim of prims) {
    if (prim.t === 'image') {
      tiefer(prim.y + prim.h);
    } else if (prim.t === 'text') {
      const groesste = prim.runs.reduce((max, run) => Math.max(max, run.font.size), 0);
      tiefer(prim.y + groesste * 0.25);
    }
  }
  return unten;
}
