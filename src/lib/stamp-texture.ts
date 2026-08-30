import { formatAspect, type StampSettings } from "./settings"

/** Long edge of the baked face texture, in pixels. */
const TEX_LONG = 1100
/** Nominal short-edge width of a stamp in millimetres, for the perf gauge. */
const STAMP_MM = 22

export interface StampMaps {
  /** Albedo; alpha carries the perforated silhouette */
  color: HTMLCanvasElement
  /** R = ink coverage, G = distance from the cut edge */
  aux: HTMLCanvasElement
  /** width / height of the baked texture */
  aspect: number
}

/** Deterministic PRNG so a re-bake produces the identical sheet of paper. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return s - Math.floor(s)
}

function vnoise(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  let fx = x - ix
  let fy = y - iy
  fx = fx * fx * (3 - 2 * fx)
  fy = fy * fy * (3 - 2 * fy)
  const a = hash2(ix, iy)
  const b = hash2(ix + 1, iy)
  const c = hash2(ix, iy + 1)
  const d = hash2(ix + 1, iy + 1)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}

function fbm(x: number, y: number, octaves = 4) {
  let amp = 0.5
  let sum = 0
  let px = x
  let py = y
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(px, py)
    px = px * 2.07 + 13.1
    py = py * 2.07 + 7.3
    amp *= 0.5
  }
  return sum
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return [26, 26, 26]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Signed distance to a rectangle; positive inside. */
function rectSdf(
  x: number,
  y: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const qx = Math.max(x0 - x, x - x1)
  const qy = Math.max(y0 - y, y - y1)
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
  const inside = Math.min(Math.max(qx, qy), 0)
  return -(outside + inside)
}

interface EdgeGeom {
  x0: number
  y0: number
  x1: number
  y1: number
  pitchX: number
  pitchY: number
  holeR: number
  band: number
}

/**
 * Perforation pitch and hole size for the gauge. Gauge is holes per 20mm,
 * so the pitch follows from the stamp's nominal physical size.
 */
function edgeGeom(s: StampSettings, x0: number, y0: number, x1: number, y1: number): EdgeGeom {
  const w = x1 - x0
  const h = y1 - y0
  const pxPerMm = Math.min(w, h) / STAMP_MM
  const pitch = (20 / s.gauge) * pxPerMm
  const nx = Math.max(3, Math.round(w / pitch))
  const ny = Math.max(3, Math.round(h / pitch))
  const holeR = Math.max(1.2, pitch * s.holeSize)
  return {
    x0,
    y0,
    x1,
    y1,
    pitchX: w / nx,
    pitchY: h / ny,
    holeR,
    band: holeR * 2.5 + 6,
  }
}

/**
 * Signed distance to the cut line, positive inside the paper. Perforations
 * subtract punched holes centred on the rectangle edge; wavy and rouletted
 * edges displace the boundary instead.
 */
function edgeDistance(
  x: number,
  y: number,
  g: EdgeGeom,
  s: StampSettings,
): number {
  let d = rectSdf(x, y, g.x0, g.y0, g.x1, g.y1)
  if (d > g.band) return d

  const w = g.x1 - g.x0
  const h = g.y1 - g.y0

  if (s.edge === "perforated") {
    // nearest hole centre on each of the four edges
    const cols = Math.round((x - g.x0) / g.pitchX)
    const rows = Math.round((y - g.y0) / g.pitchY)
    for (let i = -1; i <= 1; i++) {
      const hx = g.x0 + (cols + i) * g.pitchX
      if (hx >= g.x0 - 0.5 && hx <= g.x1 + 0.5) {
        d = Math.min(d, Math.hypot(x - hx, y - g.y0) - g.holeR)
        d = Math.min(d, Math.hypot(x - hx, y - g.y1) - g.holeR)
      }
      const hy = g.y0 + (rows + i) * g.pitchY
      if (hy >= g.y0 - 0.5 && hy <= g.y1 + 0.5) {
        d = Math.min(d, Math.hypot(x - g.x0, y - hy) - g.holeR)
        d = Math.min(d, Math.hypot(x - g.x1, y - hy) - g.holeR)
      }
    }
  } else if (s.edge === "wavy" || s.edge === "rouletted") {
    // displace whichever edge is nearest, along its own axis
    const dl = x - g.x0
    const dr = g.x1 - x
    const dt = y - g.y0
    const db = g.y1 - y
    const m = Math.min(dl, dr, dt, db)
    const along = m === dl || m === dr ? y - g.y0 : x - g.x0
    const span = m === dl || m === dr ? h : w
    const cycles =
      s.edge === "wavy"
        ? Math.max(4, Math.round(span / (g.pitchX * 1.6)))
        : Math.max(10, Math.round(span / (g.pitchX * 0.55)))
    const u = (along / span) * cycles
    const wave =
      s.edge === "wavy"
        ? Math.sin(u * Math.PI * 2)
        : Math.abs(((u % 1) + 1) % 1 - 0.5) * 4 - 1
    d += wave * g.holeR * (s.edge === "wavy" ? 0.85 : 0.32)
  }

  // torn fibre: the teeth never come off the comb perfectly clean. The
  // noise stays low frequency so the cut wanders instead of speckling.
  if (s.tear > 0.01) {
    const n = fbm(x * 0.1, y * 0.1, 3) - 0.5
    const n2 = vnoise(x * 0.42, y * 0.42) - 0.5
    d += (n * 2.4 + n2 * 0.7) * g.holeR * 0.5 * s.tear
  }
  return d
}

/** Draw text with manual tracking so it letterspaces the same everywhere. */
function trackedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  track: number,
  align: "center" | "left" | "right" = "center",
) {
  const chars = [...text]
  const widths = chars.map((c) => ctx.measureText(c).width)
  const total = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1)
  let x = align === "center" ? cx - total / 2 : align === "right" ? cx - total : cx
  ctx.textAlign = "left"
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, y)
    x += widths[i] + track
  }
  return total
}

/** Draw text bent around a circle, like a datestamp town line. */
function arcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  r: number,
  centerAngle: number,
  flip: boolean,
) {
  const chars = [...text]
  const widths = chars.map((c) => ctx.measureText(c).width)
  const total = widths.reduce((a, b) => a + b, 0)
  const dir = flip ? -1 : 1
  let a = centerAngle - (dir * total) / (2 * r)
  ctx.textAlign = "center"
  for (let i = 0; i < chars.length; i++) {
    a += (dir * widths[i]) / (2 * r)
    ctx.save()
    ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
    ctx.rotate(a + (flip ? -Math.PI / 2 : Math.PI / 2))
    ctx.fillText(chars[i], 0, 0)
    ctx.restore()
    a += (dir * widths[i]) / (2 * r)
  }
}

const SERIF = 'Georgia, "Times New Roman", "Nimbus Roman", serif'

interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Frame rules and ornaments around the design window. */
function paintFrame(
  ctx: CanvasRenderingContext2D,
  s: StampSettings,
  win: Box,
  unit: number,
) {
  if (s.frame === "none") return
  const { x, y, w, h } = win
  ctx.lineJoin = "miter"

  if (s.frame === "rule") {
    ctx.lineWidth = unit * 0.9
    ctx.strokeRect(x, y, w, h)
    return
  }

  // outer heavy rule + inner hairline, the standard classic border
  ctx.lineWidth = unit * 1.5
  ctx.strokeRect(x, y, w, h)
  const g = unit * 2.2
  ctx.lineWidth = unit * 0.55
  ctx.strokeRect(x + g, y + g, w - 2 * g, h - 2 * g)

  if (s.frame === "classic") {
    // solid corner blocks
    const c = unit * 3.4
    for (const [cx, cy] of [
      [x, y],
      [x + w - c, y],
      [x, y + h - c],
      [x + w - c, y + h - c],
    ]) {
      ctx.fillRect(cx, cy, c, c)
    }
    return
  }

  // ornate: a pearl band running between the two rules
  const r = unit * 0.75
  const step = unit * 2.6
  const inset = g / 2
  const run = (
    from: [number, number],
    to: [number, number],
  ) => {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1])
    const n = Math.max(2, Math.round(len / step))
    for (let i = 0; i <= n; i++) {
      const t = i / n
      ctx.beginPath()
      ctx.arc(
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t,
        r,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
  }
  run([x + inset, y + inset], [x + w - inset, y + inset])
  run([x + inset, y + h - inset], [x + w - inset, y + h - inset])
  run([x + inset, y + inset], [x + inset, y + h - inset])
  run([x + w - inset, y + inset], [x + w - inset, y + h - inset])
}

/** Re-separate the artwork the way the chosen press would print it. */
function separateArt(
  art: ImageBitmap,
  w: number,
  h: number,
  s: StampSettings,
): HTMLCanvasElement {
  const c = document.createElement("canvas")
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  const ctx = c.getContext("2d", { willReadFrequently: true })!
  ctx.drawImage(art, 0, 0, c.width, c.height)
  if (s.print === "offset") return c

  const [ir, ig, ib] = hexToRgb(s.inkColor)
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722) / 255
    if (s.print === "engraved") {
      // hard tonal curve: engraving has no midtone mush
      const t = clamp01(Math.pow(1 - l, 0.8))
      d[i] = Math.round(mix(255, ir, t))
      d[i + 1] = Math.round(mix(255, ig, t))
      d[i + 2] = Math.round(mix(255, ib, t))
      d[i + 3] = Math.round(d[i + 3] * clamp01(t * 1.35))
    } else if (s.print === "typeset") {
      const t = l < 0.55 ? 1 : 0
      d[i] = ir
      d[i + 1] = ig
      d[i + 2] = ib
      d[i + 3] = d[i + 3] * t
    } else {
      // photogravure: continuous tone, tinted toward the ink
      const t = clamp01(1 - l)
      d[i] = Math.round(mix(255, mix(30, ir, 0.55), t))
      d[i + 1] = Math.round(mix(255, mix(30, ig, 0.55), t))
      d[i + 2] = Math.round(mix(255, mix(30, ib, 0.55), t))
      d[i + 3] = Math.round(d[i + 3] * clamp01(t * 1.15 + 0.05))
    }
  }
  ctx.putImageData(img, 0, 0)
  return c
}

/**
 * Paint frame, artwork and lettering. `ink` mode paints the same marks in
 * flat black on transparent, which becomes the relief height field.
 */
function paintDesign(
  ctx: CanvasRenderingContext2D,
  s: StampSettings,
  art: HTMLCanvasElement | null,
  W: number,
  H: number,
  inkMode: boolean,
) {
  const unit = Math.min(W, H) / 110
  const m = Math.min(W, H) * s.margin
  ctx.save()
  ctx.fillStyle = inkMode ? "#000" : s.inkColor
  ctx.strokeStyle = inkMode ? "#000" : s.inkColor
  ctx.globalAlpha = 1

  let win: Box = { x: m, y: m, w: W - 2 * m, h: H - 2 * m }
  if (s.designOn) {
    paintFrame(ctx, s, win, unit)
    const pad = s.frame === "none" ? unit : unit * 4
    const top = s.country ? unit * 7 : 0
    const bottom = s.denomination || s.caption ? unit * 8 : 0
    win = {
      x: win.x + pad,
      y: win.y + pad + top,
      w: win.w - 2 * pad,
      h: win.h - 2 * pad - top - bottom,
    }
  }

  if (art && win.w > 4 && win.h > 4) {
    const scale = Math.min(win.w / art.width, win.h / art.height)
    const aw = art.width * scale
    const ah = art.height * scale
    const ax = win.x + (win.w - aw) / 2
    const ay = win.y + (win.h - ah) / 2
    if (inkMode) {
      // ink height comes from coverage: opaque dark areas stand highest
      const tmp = document.createElement("canvas")
      tmp.width = Math.max(1, Math.round(aw))
      tmp.height = Math.max(1, Math.round(ah))
      const tctx = tmp.getContext("2d", { willReadFrequently: true })!
      tctx.drawImage(art, 0, 0, tmp.width, tmp.height)
      const im = tctx.getImageData(0, 0, tmp.width, tmp.height)
      const d = im.data
      for (let i = 0; i < d.length; i += 4) {
        const l = (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722) / 255
        d[i] = d[i + 1] = d[i + 2] = 0
        d[i + 3] = Math.round(d[i + 3] * clamp01(1 - l * 0.85))
      }
      tctx.putImageData(im, 0, 0)
      ctx.drawImage(tmp, ax, ay)
    } else {
      ctx.drawImage(art, ax, ay, aw, ah)
    }
  }

  if (s.designOn) {
    const outer = { x: m, y: m, w: W - 2 * m, h: H - 2 * m }
    const inset = s.frame === "none" ? unit * 1.5 : unit * 5
    if (s.country) {
      ctx.font = `600 ${unit * 4.2}px ${SERIF}`
      ctx.textBaseline = "alphabetic"
      trackedText(
        ctx,
        s.country.toUpperCase(),
        outer.x + outer.w / 2,
        outer.y + inset + unit * 3.6,
        unit * 0.55,
      )
    }
    if (s.denomination) {
      ctx.font = `700 ${unit * 7}px ${SERIF}`
      ctx.textBaseline = "alphabetic"
      ctx.textAlign = "left"
      ctx.fillText(
        s.denomination,
        outer.x + inset,
        outer.y + outer.h - inset - unit * 0.5,
      )
    }
    if (s.caption) {
      ctx.font = `400 ${unit * 3.2}px ${SERIF}`
      trackedText(
        ctx,
        s.caption,
        outer.x + outer.w / 2,
        outer.y + outer.h - inset - unit * 1.2,
        unit * 0.3,
      )
    }
  }
  ctx.restore()
}

/** Killer bars and the circular datestamp, struck over everything. */
function paintPostmark(
  ctx: CanvasRenderingContext2D,
  s: StampSettings,
  W: number,
  H: number,
  inkMode: boolean,
) {
  if (!s.postmarkOn) return
  const unit = Math.min(W, H) / 110
  const cx = s.postmarkPos.x * W
  const cy = (1 - s.postmarkPos.y) * H
  const a = (s.postmarkAngle - 0.5) * Math.PI
  ctx.save()
  ctx.globalAlpha = inkMode ? 0.4 : s.postmarkStrength
  if (!inkMode) ctx.globalCompositeOperation = "multiply"
  ctx.fillStyle = "#17161a"
  ctx.strokeStyle = "#17161a"
  ctx.translate(cx, cy)
  ctx.rotate(a)

  const reach = Math.hypot(W, H)
  const dial = unit * 17
  // duplex cancel: the killer bars run off one side of the datestamp and
  // never strike across the dial itself
  const barStart =
    s.postmarkStyle === "both" ? dial * 1.15 : -reach / 2
  if (s.postmarkStyle === "bars" || s.postmarkStyle === "both") {
    ctx.lineWidth = unit * 1.7
    ctx.lineCap = "round"
    for (let i = -4; i <= 4; i++) {
      const y = i * unit * 4.3
      ctx.beginPath()
      for (let t = barStart; t <= reach / 2; t += unit) {
        const yy = y + Math.sin(t / (unit * 9)) * unit * 1.2
        if (t === barStart) ctx.moveTo(t, yy)
        else ctx.lineTo(t, yy)
      }
      ctx.stroke()
    }
  }
  if (s.postmarkStyle === "grid") {
    ctx.lineWidth = unit * 1.1
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath()
      ctx.moveTo(i * unit * 4, -reach / 2)
      ctx.lineTo(i * unit * 4, reach / 2)
      ctx.moveTo(-reach / 2, i * unit * 4)
      ctx.lineTo(reach / 2, i * unit * 4)
      ctx.stroke()
    }
  }
  if (s.postmarkStyle === "datestamp" || s.postmarkStyle === "both") {
    ctx.lineWidth = unit * 1.2
    ctx.beginPath()
    ctx.arc(0, 0, dial, 0, Math.PI * 2)
    ctx.stroke()
    ctx.lineWidth = unit * 0.6
    ctx.beginPath()
    ctx.arc(0, 0, dial - unit * 2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.textBaseline = "middle"
    ctx.font = `600 ${unit * 3.4}px ${SERIF}`
    arcText(ctx, s.postmarkCity.toUpperCase(), 0, 0, dial - unit * 4.6, -Math.PI / 2, false)
    ctx.textAlign = "center"
    ctx.font = `600 ${unit * 3.8}px ${SERIF}`
    ctx.fillText(s.postmarkDate.toUpperCase(), 0, 0)
    ctx.lineWidth = unit * 0.7
    ctx.beginPath()
    ctx.moveTo(-dial * 0.7, -unit * 5.6)
    ctx.lineTo(dial * 0.7, -unit * 5.6)
    ctx.moveTo(-dial * 0.7, unit * 5.6)
    ctx.lineTo(dial * 0.7, unit * 5.6)
    ctx.stroke()
  }
  ctx.restore()
}

/** Paper stock: base tone, fibre, foxing, watermark, handling wear. */
function paintPaper(
  ctx: CanvasRenderingContext2D,
  s: StampSettings,
  W: number,
  H: number,
) {
  const t = clamp01(s.toning)
  const r = mix(252, 214, t)
  const g = mix(250, 190, t)
  const b = mix(243, 150, t)
  ctx.fillStyle = `rgb(${r} ${g} ${b})`
  ctx.fillRect(0, 0, W, H)

  const rand = rng(0x51a3)
  // foxing: rust blooms, denser near the edges where damp gets in
  const spots = Math.round(s.foxing * 70)
  for (let i = 0; i < spots; i++) {
    const x = rand() * W
    const y = rand() * H
    const rad = (0.006 + rand() * 0.03) * Math.min(W, H)
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rad)
    const alpha = 0.1 + rand() * 0.35 * s.foxing
    grad.addColorStop(0, `rgba(146, 96, 44, ${alpha})`)
    grad.addColorStop(1, "rgba(146, 96, 44, 0)")
    ctx.fillStyle = grad
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }

  // handling: soft creases and rubbed corners
  if (s.wear > 0.01) {
    ctx.save()
    ctx.lineCap = "round"
    const creases = Math.round(1 + s.wear * 3)
    for (let i = 0; i < creases; i++) {
      const x0 = rand() * W
      const y0 = rand() * H
      const ang = rand() * Math.PI
      const len = (0.4 + rand() * 0.6) * Math.max(W, H)
      ctx.strokeStyle = `rgba(120, 104, 78, ${0.05 + 0.09 * s.wear})`
      ctx.lineWidth = Math.min(W, H) * 0.006
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.quadraticCurveTo(
        x0 + Math.cos(ang) * len * 0.5 + (rand() - 0.5) * 30,
        y0 + Math.sin(ang) * len * 0.5 + (rand() - 0.5) * 30,
        x0 + Math.cos(ang) * len,
        y0 + Math.sin(ang) * len,
      )
      ctx.stroke()
    }
    ctx.restore()
  }
}

/**
 * Bake the stamp: an albedo canvas whose alpha is the perforated silhouette,
 * plus an aux canvas holding ink coverage, edge distance and paper height.
 */
export function buildStampMaps(
  s: StampSettings,
  art: ImageBitmap | null,
): StampMaps {
  const ar = formatAspect[s.format]
  const H = ar >= 1 ? Math.round(TEX_LONG / ar) : TEX_LONG
  const W = Math.round(H * ar)

  // paper rect, inset so punched holes have room to bite into the texture
  const probe = edgeGeom(s, 0, 0, W, H)
  const pad = Math.ceil(probe.holeR * 1.6 + 8)
  const x0 = pad
  const y0 = pad
  const x1 = W - pad
  const y1 = H - pad
  const g = edgeGeom(s, x0, y0, x1, y1)

  const face = document.createElement("canvas")
  face.width = W
  face.height = H
  const fctx = face.getContext("2d", { willReadFrequently: true })!
  paintPaper(fctx, s, W, H)

  const artW = art ? Math.min(art.width, 1400) : 0
  const separated = art
    ? separateArt(art, artW, artW / (art.width / art.height), s)
    : null

  // ink weight: fade the print into the paper, or lay it on heavy
  // the design is laid out on the paper, not on the texture: the texture
  // carries extra margin so punched holes have somewhere to go
  const pw = x1 - x0
  const ph = y1 - y0
  fctx.save()
  fctx.translate(x0, y0)
  fctx.globalAlpha = clamp01(Math.min(s.ink, 1))
  paintDesign(fctx, s, separated, pw, ph, false)
  if (s.ink > 1) {
    fctx.globalAlpha = clamp01((s.ink - 1) * 0.9)
    paintDesign(fctx, s, separated, pw, ph, false)
  }
  fctx.globalAlpha = 1
  paintPostmark(fctx, s, pw, ph, false)
  fctx.restore()

  const img = fctx.getImageData(0, 0, W, H)
  const face8 = img.data

  // ink coverage, painted flat, becomes the intaglio height field
  const inkC = document.createElement("canvas")
  inkC.width = W
  inkC.height = H
  const ictx = inkC.getContext("2d", { willReadFrequently: true })!
  ictx.translate(x0, y0)
  paintDesign(ictx, s, separated, pw, ph, true)
  paintPostmark(ictx, s, pw, ph, true)
  const ink8 = ictx.getImageData(0, 0, W, H).data

  const aux = document.createElement("canvas")
  aux.width = W
  aux.height = H
  const actx = aux.getContext("2d")!
  const auxImg = actx.createImageData(W, H)
  const aux8 = auxImg.data

  // fibre and watermark live in the shader so they stay crisp at any export
  // size; the bake only resolves the cut line and the ink coverage
  const edgeSoft = Math.min(pw, ph) * 0.014
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      const d = edgeDistance(x + 0.5, y + 0.5, g, s)
      face8[i + 3] = Math.round(clamp01(d + 0.5) * 255)
      aux8[i] = ink8[i + 3]
      aux8[i + 1] = Math.round(clamp01(d / edgeSoft) * 255)
      aux8[i + 2] = 0
      aux8[i + 3] = 255
    }
  }

  fctx.putImageData(img, 0, 0)
  actx.putImageData(auxImg, 0, 0)

  return { color: face, aux, aspect: W / H }
}
