import type { Typeface } from "./settings"

/*
 * Faces cut for stamp work. Each one stands in for a class of real postal
 * lettering: a transitional serif for engraved text, a didone for the
 * commemorative style, Roman caps for the classic country line, a condensed
 * gothic for value tablets, a typewriter for machine-set locals, and a
 * copperplate script for the ornamental issues. The system fallbacks keep
 * the bake readable if a font file ever fails to arrive.
 */
export const FONT_STACKS: Record<Typeface, string> = {
  serif: '"Libre Baskerville", Georgia, "Times New Roman", serif',
  didone: '"Playfair Display Variable", "Didot", Georgia, serif',
  grotesque: '"Cinzel Variable", "Copperplate", Georgia, serif',
  condensed: '"Oswald Variable", "Arial Narrow", Impact, sans-serif',
  typewriter: '"Special Elite", "Courier New", monospace',
  script: '"Pinyon Script", "Snell Roundhand", cursive',
}

/** Face used by the postmark dial, which a different shop always cut. */
export const POSTMARK_FONT =
  '"Libre Baskerville", Georgia, "Times New Roman", serif'

/**
 * Canvas text silently falls back to a system face when a webfont has not
 * arrived, and the bake is synchronous, so every face is loaded up front and
 * the caller re-bakes once they land.
 */
export async function loadStampFonts(): Promise<void> {
  if (!("fonts" in document)) return
  const probes = [
    '400 40px "Libre Baskerville"',
    '700 40px "Libre Baskerville"',
    '700 40px "Playfair Display Variable"',
    '600 40px "Cinzel Variable"',
    '600 40px "Oswald Variable"',
    '400 40px "Special Elite"',
    '400 40px "Pinyon Script"',
  ]
  await Promise.all(probes.map((p) => document.fonts.load(p).catch(() => [])))
  await document.fonts.ready
}
