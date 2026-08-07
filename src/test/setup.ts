/**
 * Vitest setup.
 *
 * jsdom has no 2-D canvas. Stubbing `getContext` to return `null` (instead of
 * letting jsdom log "not implemented" for every call) makes the text measurer
 * fall back to its deterministic width model — which is what we *want* under
 * test: layout assertions then hold on any machine, with or without fonts.
 */
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as
    typeof HTMLCanvasElement.prototype.getContext;
}

export {};
