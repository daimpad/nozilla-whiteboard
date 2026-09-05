/**
 * Was vitest vor jedem Lauf aufsetzt.
 *
 * jsdom hat kein Canvas. `getContext` auf `null` zu stellen — statt jsdom bei
 * jedem Ruf „not implemented" schreiben zu lassen — schickt die Schriftmessung
 * auf ihr festes Rechenmodell zurück, und genau das ist unter Test *gewollt*:
 * eine Zusicherung über den Satz gilt dann auf jedem Rechner, mit Schriften
 * wie ohne.
 */
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

export {};
