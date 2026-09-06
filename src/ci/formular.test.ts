/**
 * Die Formularseite des Generators — als Vertrag gelesen.
 *
 * Drei Fragen, und alle drei sind schon einmal falsch beantwortet worden,
 * jeweils eine Datei weiter: Hat jede Angabe des Entwurfs einen Weg ins
 * Formular? Wird jede Erklärung auch dem Menschen gezeigt und nicht nur dem
 * Sprachmodell? Und sagt der Ladeweg die Wahrheit über das, was er übernommen
 * und was er verworfen hat?
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { leererEntwurf } from './entwurf';
import { zusammen } from './sitzung';

/**
 * Kommentare leeren statt entfernen — dieselbe Linie wie in `theme.test.ts`.
 *
 * Ohne das wäre dieser Wächter von dem Satz zufriedenzustellen, der ihn
 * erklärt: die erste Fassung suchte `LEITERTEXT` im ganzen Quelltext, und die
 * Gegenprobe blieb grün, weil der Kommentar über dem Feld den Namen nennt.
 * Genau dieser Fehler steht in `CLAUDE.md` schon einmal, beim Wächter über
 * `darfErsetzen()`.
 */
function ohneKommentare(quelle: string): string {
  return quelle
    .replace(/\/\*[\s\S]*?\*\//g, (treffer) => treffer.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, '');
}

const SCHRITTE_QUELLE = ohneKommentare(readFileSync('src/ci/schritte.tsx', 'utf8'));
const PROMPT_QUELLE = ohneKommentare(readFileSync('src/ci/prompt.ts', 'utf8'));
const TEXTE_QUELLE = readFileSync('src/ci/texte.ts', 'utf8');

describe('was das Formular anbietet', () => {
  /*
     Der Fehler, gegen den das steht, hat dieses Repo zweimal getroffen: eine
     Angabe, die wirkt, in der Datei steht und in jede Ausgabe geht — und für
     die es kein Feld gibt. `labelStyle` einer Form war so erreichbar, die
     Variante der Wortmarke auch: nur über den handgeschriebenen Block.
  */
  it('gibt jeder Angabe des Entwurfs ein Feld', () => {
    const geschrieben = new Set(
      [...SCHRITTE_QUELLE.matchAll(/aendere\(\{\s*([a-zA-Z]+)/g)].map((treffer) => treffer[1]),
    );
    const ohneFeld = Object.keys(leererEntwurf()).filter((name) => !geschrieben.has(name));
    expect(ohneFeld).toEqual([]);
  });

  it('schreibt nichts, was der Entwurf gar nicht führt', () => {
    // Die Gegenrichtung: ein `aendere({ tippfehler })` übersetzt nicht, aber
    // ein umbenanntes Feld ließe die Liste oben stehen und diese hier reden.
    const bekannt = new Set(Object.keys(leererEntwurf()));
    const geschrieben = [...SCHRITTE_QUELLE.matchAll(/aendere\(\{\s*([a-zA-Z]+)/g)].map(
      (treffer) => treffer[1],
    );
    expect([...new Set(geschrieben)].filter((name) => !bekannt.has(name))).toEqual([]);
  });
});

/**
 * Wo eine Texttabelle gelesen wird — und wo mit Grund nicht.
 *
 * Der Kopf von `texte.ts` schreibt die Regel aus: die Sätze sind das
 * Lastenheft *und* die Beschriftung, und sie stehen deshalb an einer Stelle.
 * Sechs der sieben Tabellen hatten beide Kunden; `LEITERTEXT` hatte nur den
 * Prompt, und im Formular standen acht Felder namens `xl4` bis `xs` ohne ein
 * Wort dazu.
 */
const NUR_FORMULAR: Record<string, string> = {
  ZEICHENTEXT: 'Der Prompt fragt nicht nach dem Zeichen-Set — ein Modell kann es nicht liefern.',
};

describe('die Erklärungen der Rollen', () => {
  const tabellen = [...TEXTE_QUELLE.matchAll(/^export const ([A-Z]+):/gm)].map((t) => t[1]);

  it('liest überhaupt Tabellen aus texte.ts', () => {
    expect(tabellen.length).toBeGreaterThan(5);
  });

  it('zeigt jede Erklärung im Formular', () => {
    const fehlend = tabellen.filter((name) => !SCHRITTE_QUELLE.includes(name));
    expect(fehlend).toEqual([]);
  });

  it('gibt jede Erklärung auch dem Sprachmodell — oder nennt den Grund', () => {
    const fehlend = tabellen.filter((name) => !PROMPT_QUELLE.includes(name) && !NUR_FORMULAR[name]);
    expect(fehlend).toEqual([]);
  });

  it('führt keine Ausnahme für eine Tabelle, die es nicht gibt', () => {
    expect(Object.keys(NUR_FORMULAR).filter((name) => !tabellen.includes(name))).toEqual([]);
  });
});

describe('was der Ladeweg über sich sagt', () => {
  const leer = leererEntwurf();
  const kopie = () => JSON.parse(JSON.stringify(leer)) as typeof leer;

  it('nennt die Rolle, die nicht zu lesen war — und nicht ihre Gruppe', () => {
    /*
       Fünfzehn gute Farben und eine Zahl in `palette.ink`: die Gruppe kam als
       „angekommen" durch, die Tinte stand danach auf nozillas Schwarz, und
       gemeldet wurde nichts. Die Prüfliste kann davon nichts sagen — `#000000`
       ist eine gültige Farbe.
    */
    const datei = kopie();
    (datei.palette as Record<string, unknown>).ink = 42;
    const { entwurf, genommen, verworfen } = zusammen(datei);

    expect(verworfen).toContain('palette.ink');
    expect(verworfen).not.toContain('palette');
    expect(genommen).toContain('palette');
    expect(entwurf.palette.ink).toBe(leer.palette.ink);
  });

  it('nennt die Gruppe, wenn die Gruppe selbst nicht zu lesen war', () => {
    const { verworfen } = zusammen({ palette: 'rot' } as never);
    expect(verworfen).toEqual(['palette']);
  });

  it('nennt denselben Fehler nicht zweimal', () => {
    // Eine Gruppe, deren einzige Rolle unlesbar ist, stünde sonst als
    // `palette.ink` *und* als `palette` da.
    const { verworfen } = zusammen({ palette: { ink: 42 } } as never);
    expect(verworfen).toEqual(['palette.ink']);
  });

  it('hält eine Farbe für angekommen, die zufällig nozillas Wert trägt', () => {
    const { genommen, verworfen } = zusammen({ palette: { ink: leer.palette.ink } } as never);
    expect(genommen).toContain('palette');
    expect(verworfen).toEqual([]);
  });

  it('beklagt keine Wortmarke, die es ehrlich nicht gibt', () => {
    /*
       `leererEntwurf()` führt `wortmarke: null`. Wer einen Entwurf ohne
       Wortmarke sicherte und wieder lud — also jeder, der auf halbem Weg
       aufhört —, bekam „ein Feld trug etwas, das dieses Formular nicht lesen
       kann: wortmarke". Ein Wächter, der auf dem eigenen Rundlauf anschlägt,
       wird beim zweiten Mal überlesen.
    */
    const { verworfen, genommen } = zusammen(kopie());
    expect(verworfen).toEqual([]);
    expect(genommen).not.toContain('wortmarke');
  });

  it('beklagt eine Wortmarke, die dasteht und nichts taugt', () => {
    // Die Gegenrichtung: `null` ist eine Auskunft, `{}` ist ein kaputter Wert.
    const { verworfen } = zusammen({ ...kopie(), wortmarke: {} as never });
    expect(verworfen).toEqual(['wortmarke']);
  });

  it('übernimmt einen vollständigen Rundlauf ohne eine einzige Klage', () => {
    const datei = kopie();
    datei.wortmarke = { svg: '<svg/>', dateiname: 'a.svg', letters: '#000000', accent: '#ff0000' };
    const { genommen, verworfen } = zusammen(datei);
    expect(verworfen).toEqual([]);
    expect(genommen).toContain('wortmarke');
    expect(genommen.length).toBe(Object.keys(leer).length);
  });
});
