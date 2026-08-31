/**
 * Ground work: the pattern that fills the field inside the frame and outside
 * the picture. Engravers cut these to make a stamp hard to forge and to stop
 * a plain tint from looking dead, so every one here is drawn from curves
 * rather than sampled from an image.
 */

export type GroundStyle =
  | "none"
  | "guilloche"
  | "burelage"
  | "crosshatch"
  | "panel"
  | "stipple"
  | "halftone"

interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface GroundOptions {
  style: GroundStyle
  /** Ink the ground is printed in, as #rrggbb */
  color: string
  /** Line or dot weight, 0 to 1 */
  weight: number
  /** Pattern pitch, 0 to 1: fine to coarse */
  scale: number
  /** Rotation in turns, 0 to 1 */
  angle: number
  /** Ink strength, 0 to 1 */
  strength: number
}

/** Deterministic noise, so a bake repeats exactly. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

/**
 * Fill `b` with the chosen ground. The caller sets the clip, the colour and
 * the alpha; this only lays down geometry.
 */
export function paintGround(
  ctx: CanvasRenderingContext2D,
  o: GroundOptions,
  b: Box,
  unit: number,
) {
  if (o.style === "none") return
  const rot = o.angle * Math.PI * 2
  ctx.save()
  ctx.globalAlpha *= 0.25 + o.strength * 0.75

  if (o.style === "panel") {
    paintPanel(ctx, b, o)
  } else if (o.style === "stipple" || o.style === "halftone") {
    paintDots(ctx, b, o, unit, o.style === "halftone")
  } else {
    // line work rotates about the centre, so the box has to grow to cover
    // its own corners once turned
    const cx = b.x + b.w / 2
    const cy = b.y + b.h / 2
    const r = Math.hypot(b.w, b.h) / 2
    ctx.translate(cx, cy)
    ctx.rotate(rot)
    const box = { x: -r, y: -r, w: r * 2, h: r * 2 }
    if (o.style === "guilloche") paintGuilloche(ctx, box, o, unit)
    else paintLines(ctx, box, o, unit, o.style === "crosshatch")
  }
  ctx.restore()
}

/** `#rrggbb` with an alpha channel appended. */
function withAlpha(hex: string, a: number) {
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255)
  return `${hex}${v.toString(16).padStart(2, "0")}`
}

/**
 * A tint that grades down the field, the ground of a modern issue. `weight`
 * sets how solid the head of the panel is, `scale` how far it fades.
 */
function paintPanel(ctx: CanvasRenderingContext2D, b: Box, o: GroundOptions) {
  const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h)
  const head = 0.3 + o.weight * 0.7
  g.addColorStop(0, withAlpha(o.color, head))
  g.addColorStop(1, withAlpha(o.color, head * (1 - o.scale * 0.95)))
  ctx.fillStyle = g
  ctx.fillRect(b.x, b.y, b.w, b.h)
}

/** Burelage: ruled lines, crossed a second time for a hatch. */
function paintLines(
  ctx: CanvasRenderingContext2D,
  b: Box,
  o: GroundOptions,
  unit: number,
  crossed: boolean,
) {
  const pitch = unit * (0.8 + o.scale * 5)
  ctx.lineWidth = unit * (0.1 + o.weight * 0.7)
  ctx.lineCap = "butt"
  const wave = o.weight * unit * 1.6
  const draw = (across: boolean) => {
    ctx.beginPath()
    for (let p = b.y; p <= b.y + b.h; p += pitch) {
      if (across) {
        ctx.moveTo(b.x, p)
        for (let x = b.x; x <= b.x + b.w; x += pitch / 2) {
          ctx.lineTo(x, p + Math.sin(x / (pitch * 1.7)) * wave)
        }
      } else {
        ctx.moveTo(p, b.y)
        for (let y = b.y; y <= b.y + b.h; y += pitch / 2) {
          ctx.lineTo(p + Math.sin(y / (pitch * 1.7)) * wave, y)
        }
      }
    }
    ctx.stroke()
  }
  draw(true)
  if (crossed) draw(false)
}

/**
 * Engine-turned line work. Two rosettes of different tooth counts, the
 * pattern a geometric lathe cuts and the reason a banknote is hard to copy.
 */
function paintGuilloche(
  ctx: CanvasRenderingContext2D,
  b: Box,
  o: GroundOptions,
  unit: number,
) {
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  // the field reaches into the corners, so the rosette is sized on the
  // diagonal rather than the short side
  const R = Math.hypot(b.w, b.h) / 2
  ctx.lineWidth = unit * (0.12 + o.weight * 0.55)
  const rings = 6 + Math.round((1 - o.scale) * 10)
  const teeth = 6 + Math.round(o.scale * 16)
  const step = 0.006 + o.scale * 0.003
  for (let k = 0; k < rings; k++) {
    const base = R * (0.22 + (0.86 * (k + 1)) / rings)
    const amp = base * (0.05 + o.weight * 0.14)
    // every other ring runs half a tooth out of step, which is what makes
    // the pattern read as woven rather than as stacked contours
    const phase = (k % 2 ? Math.PI / teeth : 0) + (k / rings) * 0.6
    ctx.beginPath()
    for (let a = 0; a <= Math.PI * 2 + step; a += step) {
      const rr = base + Math.sin(a * teeth + phase) * amp
      const x = cx + Math.cos(a) * rr
      const y = cy + Math.sin(a) * rr * (b.h / b.w || 1)
      if (a === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

/** Stipple is scattered, a halftone screen is ruled. */
function paintDots(
  ctx: CanvasRenderingContext2D,
  b: Box,
  o: GroundOptions,
  unit: number,
  ruled: boolean,
) {
  const pitch = unit * (0.9 + o.scale * 4)
  const rad = unit * (0.12 + o.weight * 0.55)
  const rand = rng(0x9e37)
  const rot = o.angle * Math.PI * 2
  ctx.beginPath()
  for (let y = b.y; y <= b.y + b.h; y += pitch) {
    for (let x = b.x; x <= b.x + b.w; x += pitch) {
      let px = x
      let py = y
      let r = rad
      if (ruled) {
        // a screen turns as a whole and its dots grow toward the foot
        const dx = px - (b.x + b.w / 2)
        const dy = py - (b.y + b.h / 2)
        px = b.x + b.w / 2 + dx * Math.cos(rot) - dy * Math.sin(rot)
        py = b.y + b.h / 2 + dx * Math.sin(rot) + dy * Math.cos(rot)
        r = rad * (0.45 + 0.9 * ((py - b.y) / b.h))
      } else {
        px += (rand() - 0.5) * pitch * 0.9
        py += (rand() - 0.5) * pitch * 0.9
        r = rad * (0.4 + rand() * 1.2)
      }
      if (r <= 0) continue
      ctx.moveTo(px + r, py)
      ctx.arc(px, py, r, 0, Math.PI * 2)
    }
  }
  ctx.fill()
}
