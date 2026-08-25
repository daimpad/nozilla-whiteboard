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
import type { CanvasElement } from '@/model/types';

/**
 * Wie weit etwas unten hinausstehen darf, ohne dass es jemanden kümmert.
 *
 * Unterlängen, Schattenversätze und die Rundung des Setzers bewegen sich in
 * dieser Größenordnung. Wer hier zu streng ist, malt die halbe Folie an.
 */
const NACHSICHT = 2;

/**
 * Um wie viele Einheiten der Inhalt unten aus dem Kasten läuft — oder `0`.
 *
 * Nur nach unten: Text wächst nach unten, und ein Kasten, der oben übersteht,
 * ist eine Absicht (ein Zeichen, das über den Rand ragt) und kein Unfall.
 */
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
const gemerkt = new WeakMap<CanvasElement, number>();

export function overflowOf(element: CanvasElement): number {
  const bekannt = gemerkt.get(element);
  if (bekannt !== undefined) return bekannt;

  const wert = rechne(element);
  gemerkt.set(element, wert);
  return wert;
}

function rechne(element: CanvasElement): number {
  // Ein Bild wird eingepasst, eine Linie hat keinen Inhalt — dort wäre die
  // Frage sinnlos.
  if (element.kind === 'image' || element.kind === 'connector') return 0;

  const unten = untersteKante(buildElementPrims(element));
  if (unten === null) return 0;

  const ueber = unten - (element.y + element.h);
  return ueber > NACHSICHT ? Math.round(ueber) : 0;
}

/**
 * Die unterste Grundlinie unter den Textprimitiven.
 *
 * **Nur Text.** Der erste Versuch maß alles Gezeichnete und schlug bei jeder
 * Karte an — der harte Versatzschatten der CI liegt absichtlich außerhalb des
 * Kastens, und eine Anzeige, die bei jedem Element aufleuchtet, ist so nutzlos
 * wie gar keine.
 *
 * Es ist auch das Richtige: Flächen, Rahmen und Zeichen werden aus dem Kasten
 * des Elements heraus gezeichnet und können ihn nicht überlaufen. Nur der
 * gesetzte Text weiß vorher nicht, wie hoch er wird. Ein Codeblock in einem
 * Markdown-Element bringt zwar eine eigene Fläche mit, aber darin steht Text —
 * der reicht ohnehin tiefer als sein Kasten hoch ist.
 *
 * Ein Textprimitiv nennt seine Grundlinie, nicht seinen Kasten. Die Unterlänge
 * darunter wird aus der Schriftgröße geschätzt: genauer ginge nur mit einem
 * zweiten Weg durch die Schriftmaße, und für „läuft es über?" ist ein Viertel
 * der Größe nah genug.
 */
function untersteKante(prims: readonly ScenePrim[]): number | null {
  let unten: number | null = null;
  for (const prim of prims) {
    if (prim.t !== 'text') continue;
    const groesste = prim.runs.reduce((max, run) => Math.max(max, run.font.size), 0);
    const kante = prim.y + groesste * 0.25;
    unten = unten === null ? kante : Math.max(unten, kante);
  }
  return unten;
}
