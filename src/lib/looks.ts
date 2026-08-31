import type { StampSettings } from "./settings"

/**
 * Four ways the same picture could be printed.
 *
 * Shown the moment artwork lands, because at that point the question is "what
 * could this be" rather than "nudge this slider". They vary the press, the
 * furniture and the palette together, since those are what actually make two
 * stamps look like different stamps. Anything the person has already typed
 * (country, denomination, caption) is left alone: a look is a treatment, not a
 * reset.
 *
 * Deliberately four. Two is not a choice and eight is a menu.
 */
export interface Look {
  id: string
  label: string
  patch: Partial<StampSettings>
}

export const looks: Look[] = [
  {
    id: "engraved",
    label: "Engraved",
    // the classic line-engraved definitive: one ink, hard rules, no pattern
    patch: {
      print: "engraved",
      frame: "classic",
      ornament: "none",
      vignette: "none",
      vignetteRule: true,
      ground: "none",
      tablets: false,
      ribbon: false,
      typeface: "serif",
      inkColor: "#1d3f6e",
      frameColor: "#1d3f6e",
      vignetteColor: "#1d3f6e",
      ink: 1,
      relief: 0.5,
      toning: 0.24,
    },
  },
  {
    id: "commemorative",
    // "Commemorative" is the right word and does not fit four across a 320px
    // sidebar, so the label says what you see instead
    label: "Ornate",
    // arched vignette, corner ornaments, a value tablet in each lower corner
    patch: {
      print: "photogravure",
      frame: "ornate",
      ornament: "rosette",
      ornamentSize: 0.12,
      vignette: "arch",
      vignetteRule: true,
      ground: "guilloche",
      groundStrength: 0.45,
      tablets: true,
      ribbon: true,
      countryArc: true,
      typeface: "didone",
      inkColor: "#7a2f36",
      frameColor: "#7a2f36",
      vignetteColor: "#7a2f36",
      groundColor: "#7a2f36",
      toning: 0.3,
    },
  },
  {
    id: "airmail",
    label: "Airmail",
    // offset, oval window, burelage across the field, condensed lettering
    patch: {
      print: "offset",
      frame: "rule",
      ornament: "none",
      vignette: "oval",
      vignetteRule: true,
      ground: "burelage",
      groundStrength: 0.5,
      groundAngle: 0.125,
      tablets: false,
      ribbon: false,
      typeface: "condensed",
      inkColor: "#1f5c53",
      frameColor: "#1f5c53",
      vignetteColor: "#1f5c53",
      groundColor: "#1f5c53",
      toning: 0.16,
    },
  },
  {
    id: "cancelled",
    label: "Cancelled",
    // used off paper: typeset, worn, and struck with a datestamp
    patch: {
      print: "typeset",
      frame: "rule",
      ornament: "none",
      vignette: "rect",
      vignetteRule: false,
      ground: "none",
      tablets: false,
      ribbon: false,
      typeface: "typewriter",
      inkColor: "#3f3a33",
      frameColor: "#3f3a33",
      vignetteColor: "#3f3a33",
      postmarkOn: true,
      postmarkStyle: "both",
      toning: 0.52,
      foxing: 0.3,
      wear: 0.45,
    },
  },
]
