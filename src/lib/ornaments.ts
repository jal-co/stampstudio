import type { OrnamentStyle } from "./settings"

/*
 * Corner ornaments as SVG path data in a 100 × 100 box, drawn for the top
 * left corner and mirrored into the other three. Path data rather than image
 * files: the bake tints them with the frame plate colour and they stay sharp
 * at any export size.
 */
export const ORNAMENTS: Record<Exclude<OrnamentStyle, "none">, string> = {
  // engraver's scroll: a curl running off the corner, with a bead
  scroll:
    "M2 2 C 36 3 62 17 74 42 C 63 35 50 34 41 41 C 46 27 33 14 2 11 Z " +
    "M63 63 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0 Z " +
    "M30 58 C 38 58 44 64 44 72 C 36 72 30 66 30 58 Z",
  // fleuron: a leaf pair on the diagonal
  leaf:
    "M1 1 C 30 1 54 13 68 36 C 54 31 41 33 33 42 C 39 27 29 13 1 9 Z " +
    "M46 52 C 60 52 70 62 70 76 C 56 76 46 66 46 52 Z " +
    "M20 70 C 30 70 38 78 38 88 C 28 88 20 80 20 70 Z",
  // deco: stepped rules, the 1930s corner
  deco:
    "M0 0 H 70 V 9 H 9 V 70 H 0 Z " +
    "M18 18 H 52 V 26 H 26 V 52 H 18 Z " +
    "M34 34 H 42 V 42 H 34 Z",
  // rosette: a compass of petals for the ornate high values
  rosette:
    "M36 6 C 46 16 46 30 36 40 C 26 30 26 16 36 6 Z " +
    "M6 36 C 16 26 30 26 40 36 C 30 46 16 46 6 36 Z " +
    "M56 46 C 66 46 74 54 74 64 C 64 64 56 56 56 46 Z " +
    "M36 36 m -6 0 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0 Z",
}

/** Draw one ornament, scaled into a corner and mirrored to face inward. */
export function paintOrnament(
  ctx: CanvasRenderingContext2D,
  style: Exclude<OrnamentStyle, "none">,
  x: number,
  y: number,
  size: number,
  flipX: boolean,
  flipY: boolean,
) {
  const p = new Path2D(ORNAMENTS[style])
  ctx.save()
  ctx.translate(x, y)
  ctx.scale((flipX ? -1 : 1) * (size / 100), (flipY ? -1 : 1) * (size / 100))
  ctx.fill(p)
  ctx.restore()
}
