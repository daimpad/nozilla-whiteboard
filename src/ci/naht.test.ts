/**
 * Die Nähte des CI-Generators — dort, wo eine Rechnung auf eine Bedienfläche
 * trifft.
 *
 * Die Rechnungen darunter sind dicht geprüft (`generator.test.ts`,
 * `ruecklauf.test.ts`, `formular.test.ts`, `probedeck.test.ts`). Was hier
 * geprüft wird, ist die Stelle davor und danach: ob ein Rückgabewert, den es
 * gibt, auch wirklich ankommt — und ob eine Zeile, die zwei Dinge meint, zwei
 * Namen trägt.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { unterschiede } from './ruecklauf';
import { leererEntwurf, type CiEntwurf } from './entwurf';
import { MASSGRUPPE, massgruppen, pruefe } from './pruefung';

const quelle = (datei: string) => readFileSync(join(process.cwd(), 'src', 'ci', datei), 'utf8');

describe('die Änderungsliste des Rücklaufs', () => {
  it('gibt jeder Zeile einen Namen, den es nur einmal gibt', () => {
    /*
       `sm` und `lg` stehen in der Größenleiter *und* bei den
       Schattenversätzen, und beide Gruppen laufen unter „Maße". Gemessen an
       zwei Entwürfen, die alle vier ändern, kamen vier Zeilen mit den Namen
       ["sm", "lg", "sm", "lg"] heraus — zweimal derselbe React-Schlüssel, und
       für den Leser zweimal derselbe Wegweiser auf zwei verschiedene Felder.
       Genau diese Mehrdeutigkeit hat `massAnker()` schon einmal gekostet; sie
       galt nur dort nicht.
    */
    const alt = leererEntwurf();
    const neu = leererEntwurf();
    neu.textScale.sm += 2;
    neu.textScale.lg += 1;
    neu.shadowOffset.sm += 1;
    neu.shadowOffset.lg += 2;
    neu.stroke.hair += 1;
    neu.sonderstufen.headline += 3;
    neu.auszeichnungEnger = -0.05;

    const zeilen = unterschiede(alt, neu);
    const schluessel = zeilen.map((zeile) => `${zeile.feld}-${zeile.gruppe ?? ''}-${zeile.name}`);
    expect(new Set(schluessel).size).toBe(zeilen.length);

    // Und die Gruppe steht wirklich dran, nicht nur im Schlüssel.
    const massZeilen = zeilen.filter((zeile) => zeile.feld === 'Maße');
    expect(massZeilen.length).toBeGreaterThan(4);
    for (const zeile of massZeilen) {
      expect(zeile.gruppe, zeile.name).toBeTruthy();
      expect(massgruppen, zeile.name).toContain(zeile.gruppe);
    }
  });

  it('nennt jede Maßgruppe so, wie sie im Formular überschrieben steht', () => {
    /*
       Ein Wegweiser, der die Stelle anders nennt als das Formular, ist einer,
       den man zweimal lesen muss — und genau das stand hier: die Zeile sagte
       „Schattenversatz sm", die Überschrift darüber „Schattenversätze". Der
       Name wohnt jetzt einmal, und das Formular *liest* ihn; geprüft wird
       deshalb, dass es das tut, und nicht, ob zwei Zeichenketten sich gleichen.
    */
    const schritte = quelle('schritte.tsx');
    for (const gruppe of massgruppen) {
      expect(schritte, gruppe).toContain(`MASSGRUPPE.${gruppe}.ueberschrift`);
      expect(MASSGRUPPE[gruppe].eine.length, gruppe).toBeGreaterThan(2);
      expect(MASSGRUPPE[gruppe].ueberschrift.length, gruppe).toBeGreaterThan(2);
    }
    // Und keine Überschrift steht daneben noch einmal als Literal.
    expect(schritte).not.toContain('>Schattenversätze<');
  });

  it('lässt die Zeilen ohne Maßgruppe ihren Namen behalten', () => {
    const alt = leererEntwurf();
    const neu = leererEntwurf();
    neu.palette.signal = '#123456';
    neu.markenname = 'Anders';
    const zeilen = unterschiede(alt, neu);
    expect(zeilen.map((zeile) => zeile.gruppe)).toEqual([undefined, undefined]);
    expect(zeilen.map((zeile) => zeile.name).sort()).toEqual(['markenname', 'signal']);
  });
});

describe('die Prüfliste nennt, was der Wortmarken-Leser nicht mitnimmt', () => {
  /*
     `ungeleseneAngaben()` zu prüfen genügt nicht — eine Rechnung kann stimmen
     und ihr Kunde sie trotzdem nicht rufen. Genau das kam in der Gegenprobe
     durch: die Rechnung war geprüft, die Zeile in `pruefeWortmarke()` ließ
     sich entschärfen, und alle 59 Prüfungen des Generators blieben grün.
  */
  const mitMarke = (svg: string): CiEntwurf => ({
    ...leererEntwurf(),
    id: 'probe',
    label: 'Probe',
    markenname: 'Probe',
    produkt: 'Probe',
    wortmarke: { svg, dateiname: 'p.svg', letters: '#111111', accent: '' },
  });
  const wortmarkenbefunde = (svg: string) =>
    pruefe(mitMarke(svg)).filter((befund) => befund.feld === 'Wortmarke');

  const sauber =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 48">' +
    '<path d="M0 10 H150 V38 H0 Z" fill="#111111"/></svg>';

  it('meldet eine Transformation als Fehler', () => {
    const mitTransform = sauber
      .replace('<path', '<g transform="translate(0,-1004.36)"><path')
      .replace('</svg>', '</g></svg>');
    const befunde = wortmarkenbefunde(mitTransform);
    expect(
      befunde.some((befund) => befund.rang === 'fehler' && /Transformation/.test(befund.text)),
    ).toBe(true);
  });

  it('meldet eine Form, die kein Pfad ist, als Fehler', () => {
    const mitKreis = sauber.replace(
      '</svg>',
      '<circle cx="180" cy="24" r="10" fill="#E4003A"/></svg>',
    );
    const befunde = wortmarkenbefunde(mitKreis);
    expect(
      befunde.some((befund) => befund.rang === 'fehler' && /kein <path>/.test(befund.text)),
    ).toBe(true);
  });

  it('schweigt zu einer Datei, die nur Pfade führt', () => {
    /*
       Die Gegenrichtung, und sie ist hier die eigentliche: ein Wächter, der
       auf einer gewöhnlichen Datei anschlägt, wird beim ersten Mal als
       Rauschen abgetan und schweigt dann auch dort, wo es zählt.
    */
    const befunde = wortmarkenbefunde(sauber);
    expect(befunde.filter((befund) => befund.rang === 'fehler')).toEqual([]);
  });
});

describe('was die Bedienflächen aus den Rückgabewerten machen', () => {
  it('zeigt den Bericht der gemerkten Sitzung genauso wie den einer Datei', () => {
    /*
       `liesEntwurf()` gab `zusammen(gelesen).entwurf` zurück und warf den
       Bericht weg — für den Sitzungsweg fiel damit genau die Auskunft heraus,
       die der Dateiweg zwanzig Zeilen weiter anzeigt. Eine gemerkte Sitzung
       mit `palette.ink: 42` stellte die Tinte stumm auf nozillas Schwarz, und
       die Prüfliste kann davon nichts sagen: #000000 ist ein gültiger Wert.

       Geprüft wird an der Quelle, weil die Naht in einer Komponente sitzt und
       nicht in einer Rechnung — dieselbe Bauart wie `replaceGuard.test.ts`.
    */
    const generator = quelle('CiGenerator.tsx');
    // Ein Satz, zwei Kunden: der Dateiweg und der Sitzungsweg.
    expect(generator).toContain('function verworfenSatz(');
    const rufe = generator.match(/verworfenSatz\(/g) ?? [];
    expect(rufe.length).toBeGreaterThanOrEqual(3);
    // Und der Sitzungsweg reicht den Bericht wirklich durch.
    expect(generator).toContain('ersterEntwurf().verworfen');
  });

  it('gibt „Entwurf laden" einen Weg ohne Maus', () => {
    /*
       `class="hidden"` ist `display: none`, und damit ist das Feld aus dem
       Baum: gemessen trug die Kopfleiste drei erreichbare Knöpfe, und
       „Entwurf laden" war ein nacktes <label> mit tabindex=null und
       role=null — der einzige Weg der Leiste, den man ohne Maus nicht
       erreicht. Ein `sr-only` bleibt gezeichnet und damit fokussierbar.
    */
    const generator = quelle('CiGenerator.tsx');
    const feld = /<input\s+type="file"[\s\S]*?\/>/.exec(generator)?.[0] ?? '';
    expect(feld).toBeTruthy();
    expect(feld).toContain('sr-only');
    expect(feld).not.toContain('"hidden"');
  });

  it('bindet die Quittung des Farbfelds an den Wert, den sie erklärt', () => {
    /*
       Die Quittung „Übernommen: …" hing nur am Tippen im Textfeld. Der
       Farbwähler unmittelbar daneben schreibt denselben Wert, ohne davon zu
       wissen: gemessen stand der Satz „die Deckkraft fiel dabei weg" Zeichen
       für Zeichen weiter unter einer Farbe, die nie korrigiert wurde.
    */
    const felder = quelle('felder.tsx');
    expect(felder).toContain('korrigiert.fuer === wert');
  });

  it('nennt eine Farbrolle einmal und nicht zweimal', () => {
    // Gemessen hieß jedes der sechzehn Felder „signal signal", „ink ink" — die
    // Aufrufstelle gibt als `label` denselben Schlüssel mit, den `rolle` trägt.
    const felder = quelle('felder.tsx');
    expect(felder).toContain('label === rolle ? null :');
  });
});
