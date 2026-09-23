/**
 * Eine Familie aus der Schriftbibliothek für eine Rolle wählen.
 *
 * Eine Schrift steht in einem Entwurf an zwei Stellen, und beide müssen
 * zueinander passen: im **Stapel** der Rolle (`fontFamily`) und in der
 * **Schnittliste** (`webfontFaces`). Der erste Name eines Stapels ist ein
 * Fremdschlüssel auf die Schnittliste — passt er nicht, findet der Export
 * keine Datei und setzt still in der Ersatzschrift. Von Hand ist das die
 * häufigste Panne im Schritt „Schrift", und die Wahl aus der Bibliothek ist
 * vor allem dazu da, sie unmöglich zu machen.
 *
 * Dazu eine dritte Stelle, die man leicht übersieht: die **anderen** Stapel.
 * Hinter der eigenen Schrift nennt jeder Stapel die übrigen Schriften dieser
 * Marke, und der Export sucht ein fehlendes Zeichen in genau dieser
 * Reihenfolge (`ersatzkette()`). Wer Inter gegen DM Sans tauscht, muss sie
 * auch dort tauschen, wo Inter als Geschwister stand — sonst verweist der
 * Stapel der Überschrift auf eine Schrift, die es in dieser Marke nicht mehr
 * gibt, und der Bildschirm misst mit etwas anderem als der Export zeichnet.
 */
import { bibliotheksfamilie } from '@/assets/schriftbibliothek';
import type { FamilyRole } from '@/theme/brandTheme';
import { neueKennung, schriftRollen, type CiEntwurf, type Schnitt } from './entwurf';
import { ersterName } from './pruefung';

const ohneZeichen = (teil: string) => teil.trim().replace(/^['"]|['"]$/g, '');

/**
 * Den Stapel und die Schnittliste für eine gewählte Familie rechnen.
 *
 * Gibt nur die beiden Felder zurück, die sich ändern — dieselbe Form, die
 * `aendere()` im Formular annimmt. Ist die Familie nicht in der Bibliothek,
 * ändert sich nichts: angeboten werden nur Familien, die dort stehen, und eine
 * stille Teilwahl wäre schlimmer als keine.
 */
export function waehleFamilie(
  entwurf: CiEntwurf,
  rolle: FamilyRole,
  familie: string,
): Pick<CiEntwurf, 'fontFamily' | 'webfontFaces'> {
  const eintrag = bibliotheksfamilie(familie);
  if (!eintrag) return { fontFamily: entwurf.fontFamily, webfontFaces: entwurf.webfontFaces };

  const alt = ersterName(entwurf.fontFamily[rolle]);
  const fontFamily = { ...entwurf.fontFamily };
  /*
     Trägt die alte Familie danach noch eine andere Rolle, ist sie weiter eine
     Schrift dieser Marke — dann bleibt sie auch dort als Geschwister stehen,
     wo sie stand. Das war der erste Fehler dieser Funktion: Auszeichnung und
     Fließtext in Lora, die Auszeichnung auf Montserrat gestellt, und der
     Fließtext wanderte mit, weil sein eigener erster Name wie ein Geschwister
     behandelt wurde.
  */
  const bleibt = schriftRollen.some(
    (andere) => andere !== rolle && ersterName(entwurf.fontFamily[andere]) === alt,
  );

  for (const andere of schriftRollen) {
    const teile = entwurf.fontFamily[andere]
      .split(',')
      .map((teil) => teil.trim())
      .filter(Boolean);
    /*
       In der eigenen Rolle wird der erste Name ersetzt. In den anderen nie
       der erste — der gehört ihrer eigenen Rolle — und die Geschwister nur,
       wenn die alte Schrift in dieser Marke nicht mehr vorkommt. Wer dort
       bewusst eine andere Reihenfolge gebaut hat, hat damit auch die
       Ersatzkette gebaut, und die wird nicht umgedeutet.
    */
    const ersetzt =
      andere === rolle
        ? [`'${familie}'`, ...teile.slice(1)]
        : teile.map((teil, stelle) =>
            stelle > 0 && !bleibt && ohneZeichen(teil) === alt ? `'${familie}'` : teil,
          );
    // Eine Familie zweimal im Stapel ist kein Fehler, aber Rauschen.
    const gesehen = new Set<string>();
    fontFamily[andere] = ersetzt
      .filter((teil) => {
        const name = ohneZeichen(teil);
        if (gesehen.has(name)) return false;
        gesehen.add(name);
        return true;
      })
      .join(', ');
  }

  /*
     Die Schnitte der alten Familie gehen nur mit, wenn sie keine Rolle mehr
     trägt. Wer Auszeichnung und Fließtext in derselben Schrift hatte und nur
     die Auszeichnung tauscht, behält die Schnitte für den Fließtext.
  */
  const nochBenutzt = new Set(schriftRollen.map((r) => ersterName(fontFamily[r])));
  const behalten = entwurf.webfontFaces.filter(
    (face) => face.family !== alt || nochBenutzt.has(alt),
  );
  const schonDa = new Set(
    behalten
      .filter((face) => face.family === familie && face.style === 'normal')
      .map((face) => face.weight),
  );
  const dazu: Schnitt[] = eintrag.schnitte
    .filter((schnitt) => !schonDa.has(schnitt.weight))
    .map((schnitt) => ({
      family: familie,
      weight: schnitt.weight,
      style: 'normal',
      file: schnitt.file,
      kennung: neueKennung(),
    }));

  return { fontFamily, webfontFaces: [...behalten, ...dazu] };
}

/** Die Familie, die eine Rolle gerade trägt — sofern sie in der Bibliothek steht. */
export function gewaehlteFamilie(entwurf: CiEntwurf, rolle: FamilyRole): string {
  return bibliotheksfamilie(ersterName(entwurf.fontFamily[rolle]))?.familie ?? '';
}
