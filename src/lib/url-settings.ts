import { useCallback, useMemo, useRef, useState } from "react"
import {
  createParser,
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import {
  defaultSettings,
  type Inscription,
  type StampSettings,
} from "./settings"

/**
 * The stamp lives in the query string, so a design is a link.
 *
 * Only fields that differ from `defaultSettings` are written, which is what
 * keeps a URL to six or seven params instead of sixty. nuqs does the omitting
 * through `clearOnDefault`, on by default in v2.
 *
 * `inscriptions` is the one field left out: eleven keys per line, any number of
 * lines, and no flat encoding of it stays readable. It stays in React state, so
 * a shared link reproduces everything except hand-placed lettering.
 */

/** Rounded float. Sliders emit 0.7200000000000001; nobody needs that in a URL. */
const num = (decimals: number) =>
  createParser({
    parse: (v: string) => {
      const n = Number.parseFloat(v)
      return Number.isFinite(n) ? n : null
    },
    serialize: (n: number) => String(Number(n.toFixed(decimals))),
  })

/** A `{ x, y }` pair as `x,y`. */
const xy = createParser({
  parse: (v: string) => {
    const [x, y] = v.split(",").map(Number)
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
  },
  serialize: (p: { x: number; y: number }) =>
    `${Number(p.x.toFixed(4))},${Number(p.y.toFixed(4))}`,
  eq: (a, b) => a.x === b.x && a.y === b.y,
})

const lit = <T extends string>(values: readonly T[], fallback: T) =>
  parseAsStringLiteral(values).withDefault(fallback)

const d = defaultSettings

/** Every settings key except `inscriptions`. */
type UrlKeys = Omit<StampSettings, "inscriptions">

export const stampParsers = {
  // paper and edge
  format: lit(["portrait", "landscape", "square", "tall", "wide"], d.format),
  size: num(3).withDefault(d.size),
  edge: lit(["perforated", "wavy", "rouletted", "imperforate"], d.edge),
  gauge: num(2).withDefault(d.gauge),
  holeSize: num(3).withDefault(d.holeSize),
  tear: num(3).withDefault(d.tear),

  // ageing
  toning: num(3).withDefault(d.toning),
  fiber: num(3).withDefault(d.fiber),
  foxing: num(3).withDefault(d.foxing),
  wear: num(3).withDefault(d.wear),
  watermark: num(3).withDefault(d.watermark),

  // press
  print: lit(["engraved", "offset", "photogravure", "typeset"], d.print),
  inkColor: parseAsString.withDefault(d.inkColor),
  ink: num(3).withDefault(d.ink),
  relief: num(3).withDefault(d.relief),

  // furniture
  designOn: parseAsBoolean.withDefault(d.designOn),
  frame: lit(["none", "rule", "classic", "ornate", "arched"], d.frame),
  frameColor: parseAsString.withDefault(d.frameColor),
  typeface: lit(
    ["serif", "didone", "grotesque", "condensed", "typewriter", "script"],
    d.typeface,
  ),
  ornament: lit(["none", "scroll", "leaf", "deco", "rosette"], d.ornament),
  ornamentSize: num(3).withDefault(d.ornamentSize),
  vignette: lit(["none", "rect", "arch", "oval", "circle"], d.vignette),
  vignetteRule: parseAsBoolean.withDefault(d.vignetteRule),
  vignetteColor: parseAsString.withDefault(d.vignetteColor),
  feather: num(3).withDefault(d.feather),
  countryArc: parseAsBoolean.withDefault(d.countryArc),
  tablets: parseAsBoolean.withDefault(d.tablets),
  ribbon: parseAsBoolean.withDefault(d.ribbon),
  country: parseAsString.withDefault(d.country),

  // ground
  ground: lit(
    ["none", "guilloche", "burelage", "crosshatch", "panel", "stipple", "halftone"],
    d.ground,
  ),
  groundColor: parseAsString.withDefault(d.groundColor),
  groundWeight: num(3).withDefault(d.groundWeight),
  groundScale: num(3).withDefault(d.groundScale),
  groundAngle: num(4).withDefault(d.groundAngle),
  groundStrength: num(3).withDefault(d.groundStrength),
  groundUnderArt: parseAsBoolean.withDefault(d.groundUnderArt),
  groundClear: num(3).withDefault(d.groundClear),

  // value and caption
  denomination: parseAsString.withDefault(d.denomination),
  denomAnchor: lit(
    ["bottom-left", "bottom-center", "bottom-right", "top-left", "top-right"],
    d.denomAnchor,
  ),
  denomPos: xy.withDefault(d.denomPos),
  caption: parseAsString.withDefault(d.caption),
  margin: num(4).withDefault(d.margin),

  // artwork placement
  artFit: lit(["contain", "cover", "stretch"], d.artFit),
  artBleed: parseAsBoolean.withDefault(d.artBleed),
  artZoom: num(3).withDefault(d.artZoom),
  artPos: xy.withDefault(d.artPos),

  // cancellation
  postmarkOn: parseAsBoolean.withDefault(d.postmarkOn),
  postmarkStyle: lit(["bars", "datestamp", "both", "grid"], d.postmarkStyle),
  postmarkCity: parseAsString.withDefault(d.postmarkCity),
  postmarkDate: parseAsString.withDefault(d.postmarkDate),
  postmarkAngle: num(4).withDefault(d.postmarkAngle),
  postmarkPos: xy.withDefault(d.postmarkPos),
  postmarkStrength: num(3).withDefault(d.postmarkStrength),

  // presentation
  scene: lit(["single", "envelope", "sheet"], d.scene),
  peelDirection: lit(
    [
      "top-left",
      "top",
      "top-right",
      "right",
      "bottom-right",
      "bottom",
      "bottom-left",
      "left",
    ],
    d.peelDirection,
  ),
  peelAmount: num(3).withDefault(d.peelAmount),
  curl: num(3).withDefault(d.curl),
  shadow: num(3).withDefault(d.shadow),
  light: xy.withDefault(d.light),
  background: lit(["transparent", "white", "black"], d.background),
  exportSize: num(0).withDefault(d.exportSize),
}

/**
 * Add a field to `StampSettings` upstream without adding a parser here and
 * this line stops compiling, rather than the field quietly dropping out of
 * every shared link. `never` on the left names the keys that are missing.
 */
const _everyFieldHasAParser: Exclude<
  keyof UrlKeys,
  keyof typeof stampParsers
> extends never
  ? true
  : never = true
void _everyFieldHasAParser

/** Artwork source, kept separate from the settings themselves. */
export const artParsers = {
  /** A bundled template id. */
  template: parseAsString,
  /**
   * Any image URL. Fetched, so the host has to allow cross-origin reads;
   * raw.githubusercontent.com and images.unsplash.com both do.
   */
  art: parseAsString,
}

/**
 * `useState<StampSettings>` backed by the query string.
 *
 * Same signature as the `useState` it replaces, including functional updates,
 * so callers do not need to know where the value lives.
 */
export function useStampSettings() {
  const [urlValues, setUrlValues] = useQueryStates(stampParsers, {
    history: "replace",
    limitUrlUpdates: { method: "throttle", timeMs: 120 },
  })
  // not in the URL, see the note at the top of this file
  const [inscriptions, setInscriptions] = useState<Inscription[]>(
    defaultSettings.inscriptions,
  )

  const settings = useMemo(
    () => ({ ...(urlValues as UrlKeys), inscriptions }) as StampSettings,
    [urlValues, inscriptions],
  )

  // App passes `setSettings` to callbacks with empty dependency arrays, so the
  // identity has to be stable. Reading current settings from a ref keeps it
  // that way while functional updates still see fresh values.
  const latest = useRef(settings)
  latest.current = settings

  const setSettings = useCallback(
    (next: StampSettings | ((prev: StampSettings) => StampSettings)) => {
      const value =
        typeof next === "function"
          ? (next as (p: StampSettings) => StampSettings)(latest.current)
          : next
      const { inscriptions: lines, ...rest } = value
      setInscriptions(lines)
      void setUrlValues(rest)
    },
    [setUrlValues],
  )

  return [settings, setSettings] as const
}
