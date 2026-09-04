/**
 * Der Platzhalter für die Wege von jsPDF, die dieses Werkzeug nicht geht.
 *
 * jsPDF führt `canvg` und `html2canvas` als optionale Abhängigkeiten und lädt
 * sie im Rumpf über `import("canvg")` beziehungsweise `import("html2canvas")`
 * nach. Gebraucht werden sie für `doc.svg()` und `doc.html()` — also für die
 * beiden Wege, ein PDF aus einem *Dokument* zu machen. Dieses Werkzeug macht
 * seines aus der `Scene` und ruft keinen von beiden; die erste Regel des
 * Projekts verbietet den zweiten Zeichner ausdrücklich.
 *
 * Rollup sieht die beiden Ausdrücke trotzdem und legt zwei Lazy-Chunks an:
 * 202 kB html2canvas und 160 kB canvg, zusammen 362 kB, die gebaut und
 * ausgeliefert werden und die kein Browser je anfordert. `vite.config.ts`
 * leitet die beiden Kennungen deshalb hierher.
 *
 * **Was das kostet**, wenn doch einmal jemand `doc.html()` ruft: er bekommt
 * ein leeres Modul und einen Fehler an der Stelle, an der jsPDF den
 * Konstruktor sucht. Das ist der gewollte Preis — und lauter als 362 kB
 * stiller Ballast.
 */
export default {};
