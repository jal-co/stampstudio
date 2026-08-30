export type StampFormat =
  | "portrait"
  | "landscape"
  | "square"
  | "tall"
  | "wide"
export type EdgeStyle = "perforated" | "wavy" | "rouletted" | "imperforate"
export type PrintMethod = "engraved" | "offset" | "photogravure" | "typeset"
export type FrameStyle = "none" | "rule" | "classic" | "ornate"
export type PostmarkStyle = "bars" | "datestamp" | "both" | "grid"
export type Scene = "single" | "envelope" | "sheet"
export type PeelDirection =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left"

export interface StampSettings {
  /** Stamp proportions, before perforations */
  format: StampFormat
  /** Stamp scale within the canvas, 0.3–1 */
  size: number
  /** Edge treatment: punched perfs, self-adhesive wave, slits, or a clean cut */
  edge: EdgeStyle
  /** Perforation gauge: holes per 2cm of edge, 7–16 (12 is common) */
  gauge: number
  /** Hole radius relative to the tooth pitch, 0.2–0.55 */
  holeSize: number
  /** Ragged fibre left on the torn teeth, 0–1 */
  tear: number

  /** Paper whiteness → age toning, 0 = bright white, 1 = deep tan */
  toning: number
  /** Laid/wove fibre texture strength, 0–1 */
  fiber: number
  /** Rust-brown foxing spots from damp storage, 0–1 */
  foxing: number
  /** Handling wear: creases, corner scuffs, thinned edges, 0–1 */
  wear: number
  /** Impressed watermark visible through the paper, 0–1 */
  watermark: number

  /** Printing process: drives ink separation and relief character */
  print: PrintMethod
  /** Ink colour for engraved / typeset printing */
  inkColor: string
  /** Ink weight: 0 = ghost print, 1 = as uploaded, up to 2 = heavy plate */
  ink: number
  /** Intaglio relief: the ink stands proud of the paper, 0–1 */
  relief: number

  /** Draw the stamp furniture: frame, country, denomination */
  designOn: boolean
  /** Border treatment around the design window */
  frame: FrameStyle
  /** Country line, printed across the top */
  country: string
  /** Face value, printed in the lower corner */
  denomination: string
  /** Optional caption under the design window */
  caption: string
  /** Design window inset from the paper edge, 0.02–0.2 */
  margin: number

  /** Cancellation overprint */
  postmarkOn: boolean
  postmarkStyle: PostmarkStyle
  /** Datestamp town name */
  postmarkCity: string
  /** Datestamp date line */
  postmarkDate: string
  /** Cancel rotation in turns, 0–1 */
  postmarkAngle: number
  /** Cancel centre in uv space */
  postmarkPos: { x: number; y: number }
  /** Cancel ink strength, 0–1 */
  postmarkStrength: number

  /** Presentation: a single stamp, one on an envelope, or a sheet */
  scene: Scene
  /** Corner being lifted */
  peelDirection: PeelDirection
  /** Lift progress, 0–1 */
  peelAmount: number
  /** Curl radius, 0.02–0.25 */
  curl: number
  /** Drop-shadow strength under the curl, 0–1 */
  shadow: number
  /** Light position in uv space */
  light: { x: number; y: number }
  /** Preview background; transparent renders the standard checkerboard */
  background: "transparent" | "white" | "black"
  /** Export resolution (square, px) */
  exportSize: number
}

export const defaultSettings: StampSettings = {
  format: "portrait",
  size: 0.72,
  edge: "perforated",
  gauge: 11.5,
  holeSize: 0.3,
  tear: 0.22,

  toning: 0.24,
  fiber: 0.45,
  foxing: 0.12,
  wear: 0.2,
  watermark: 0.15,

  print: "engraved",
  inkColor: "#1d3f6e",
  ink: 1,
  relief: 0.45,

  designOn: true,
  frame: "classic",
  country: "UNITED STATES POSTAGE",
  denomination: "13¢",
  caption: "",
  margin: 0.075,

  postmarkOn: false,
  postmarkStyle: "both",
  postmarkCity: "NEW YORK NY",
  postmarkDate: "12 JUN 1978",
  postmarkAngle: 0.535,
  postmarkPos: { x: 0.33, y: 0.6 },
  postmarkStrength: 0.58,

  scene: "single",
  peelDirection: "top-right",
  peelAmount: 0,
  curl: 0.09,
  shadow: 0.22,
  light: { x: 0.62, y: 0.72 },
  background: "transparent",
  exportSize: 2048,
}

/** Width / height of the paper for each format. */
export const formatAspect: Record<StampFormat, number> = {
  portrait: 0.82,
  landscape: 1.22,
  square: 1,
  tall: 0.66,
  wide: 1.62,
}

export const peelAngles: Record<PeelDirection, number> = {
  // angle of the direction the lift travels (from corner into the stamp)
  "top-right": (225 * Math.PI) / 180,
  top: (270 * Math.PI) / 180,
  "top-left": (315 * Math.PI) / 180,
  left: 0,
  "bottom-left": (45 * Math.PI) / 180,
  bottom: (90 * Math.PI) / 180,
  "bottom-right": (135 * Math.PI) / 180,
  right: Math.PI,
}
