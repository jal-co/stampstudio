import type { StampSettings } from "./settings"

export interface PhotoCredit {
  /** Photograph title as the source records it */
  title: string
  creator: string
  creatorUrl: string
  /** e.g. "CC BY 2.0" */
  license: string
  licenseUrl: string
  /** Page the photograph was found on */
  source: string
}

export interface Template {
  id: string
  label: string
  /** Bundled photograph, served from public/ */
  image: string
  credit: PhotoCredit
  patch: Partial<StampSettings>
}

const CC_BY_2 = {
  license: "CC BY 2.0",
  licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
}

/*
 * Finished stamps: a photograph plus the plates that suit it. The pictures
 * are Creative Commons, found through Openverse, bundled here so the bake
 * never depends on someone else's CDN. Every one keeps its credit.
 */
export const templates: Template[] = [
  {
    id: "beacon",
    label: "Beacon",
    image: "/templates/lighthouse.jpg",
    credit: {
      title: "Lighthouse",
      creator: "Kenneth Moore Photography",
      creatorUrl: "https://www.flickr.com/photos/50276595@N03",
      source: "https://www.flickr.com/photos/50276595@N03/8486376375",
      ...CC_BY_2,
    },
    patch: {
      ground: "guilloche",
      groundColor: "#14418c",
      groundWeight: 0.6,
      groundScale: 0.5,
      groundStrength: 0.5,
      format: "portrait",
      print: "engraved",
      inkColor: "#14418c",
      frameColor: "#14418c",
      vignetteColor: "#14418c",
      typeface: "grotesque",
      frame: "arched",
      vignette: "arch",
      vignetteRule: true,
      countryArc: true,
      tablets: true,
      country: "United States Postage",
      denomination: "2",
      caption: "",
      artFit: "cover",
      margin: 0.055,
      gauge: 11,
      toning: 0.26,
      relief: 0.55,
    },
  },
  {
    id: "national-park",
    label: "National park",
    image: "/templates/mountain.jpg",
    credit: {
      title: "Hallet Peak, Rocky Mountain N.P.",
      creator: "Dusty J",
      creatorUrl: "https://www.flickr.com/photos/55608722@N06",
      source: "https://www.flickr.com/photos/55608722@N06/6314607981",
      ...CC_BY_2,
    },
    patch: {
      format: "landscape",
      print: "engraved",
      inkColor: "#1f5c3a",
      frameColor: "#1f5c3a",
      vignetteColor: "#1f5c3a",
      typeface: "serif",
      frame: "rule",
      vignette: "rect",
      vignetteRule: true,
      country: "National Parks",
      denomination: "15",
      caption: "Rocky Mountain",
      ribbon: true,
      artFit: "cover",
      margin: 0.05,
      gauge: 11.5,
      toning: 0.2,
    },
  },
  {
    id: "wildlife",
    label: "Wildlife",
    image: "/templates/heron.jpg",
    credit: {
      title: "The River Wey Navigation, heron hiding",
      creator: "Gareth1953 All Right Now",
      creatorUrl: "https://www.flickr.com/photos/40837632@N05",
      source: "https://www.flickr.com/photos/40837632@N05/9614062433",
      ...CC_BY_2,
    },
    patch: {
      ground: "burelage",
      groundColor: "#1c5b6b",
      groundWeight: 0.3,
      groundScale: 0.2,
      groundAngle: 0.125,
      groundStrength: 0.4,
      format: "portrait",
      print: "photogravure",
      inkColor: "#1c5b6b",
      frameColor: "#1c5b6b",
      vignetteColor: "#1c5b6b",
      typeface: "didone",
      frame: "ornate",
      vignette: "oval",
      vignetteRule: true,
      feather: 0.14,
      ornament: "leaf",
      ornamentSize: 0.09,
      country: "Wildlife of America",
      denomination: "29",
      caption: "",
      denomAnchor: "bottom-center",
      artFit: "cover",
      margin: 0.055,
      gauge: 12,
      toning: 0.16,
    },
  },
  {
    id: "maritime",
    label: "Maritime",
    image: "/templates/tallship.jpg",
    credit: {
      title: "A Calm at a Mediterranean Port, the sailing ship (detail)",
      creator: "Randy Son Of Robert",
      creatorUrl: "https://www.flickr.com/photos/46042146@N00",
      source: "https://www.flickr.com/photos/46042146@N00/2711066783",
      ...CC_BY_2,
    },
    patch: {
      format: "portrait",
      print: "engraved",
      inkColor: "#1b3350",
      frameColor: "#1b3350",
      vignetteColor: "#1b3350",
      typeface: "serif",
      frame: "ornate",
      vignette: "arch",
      vignetteRule: true,
      ornament: "scroll",
      ornamentSize: 0.08,
      countryArc: true,
      tablets: true,
      ribbon: true,
      country: "United States Postage",
      denomination: "5",
      denomPos: { x: 0, y: -0.01 },
      caption: "at PORT",
      artFit: "cover",
      margin: 0.05,
      gauge: 11,
      toning: 0.3,
    },
  },
  {
    id: "botanical",
    label: "Botanical",
    image: "/templates/flower.jpg",
    credit: {
      title: "The blue bell is the sweetest flower",
      creator: "Orchids love rainwater",
      creatorUrl: "https://www.flickr.com/photos/37072378@N08",
      source: "https://www.flickr.com/photos/37072378@N08/17714873202",
      ...CC_BY_2,
    },
    patch: {
      ground: "crosshatch",
      groundColor: "#6d2a63",
      groundWeight: 0.22,
      groundScale: 0.18,
      groundStrength: 0.35,
      format: "portrait",
      print: "photogravure",
      inkColor: "#6d2a63",
      frameColor: "#6d2a63",
      vignetteColor: "#6d2a63",
      typeface: "didone",
      frame: "ornate",
      vignette: "oval",
      vignetteRule: true,
      feather: 0.18,
      ornament: "rosette",
      ornamentSize: 0.1,
      country: "Botanical Series",
      denomination: "5",
      caption: "Bluebell",
      ribbon: true,
      artFit: "cover",
      margin: 0.06,
      gauge: 12,
      toning: 0.2,
    },
  },
  {
    id: "engineering",
    label: "Engineering",
    image: "/templates/bridge.jpg",
    credit: {
      title: "West Garfield Street Bridge, 1929",
      creator: "Seattle Municipal Archives",
      creatorUrl: "https://www.flickr.com/photos/24256351@N04",
      source: "https://www.flickr.com/photos/24256351@N04/4257832624",
      ...CC_BY_2,
    },
    patch: {
      format: "landscape",
      print: "engraved",
      inkColor: "#2f4356",
      ink: 0.92,
      frameColor: "#2f4356",
      vignetteColor: "#2f4356",
      typeface: "condensed",
      frame: "classic",
      ornament: "deco",
      ornamentSize: 0.09,
      vignette: "rect",
      // no rule around the window: the picture fades into the paper instead
      vignetteRule: false,
      feather: 0.68,
      country: "American Engineering",
      denomination: "20",
      denomAnchor: "bottom-right",
      artFit: "cover",
      margin: 0.06,
      gauge: 10,
      toning: 0.42,
      foxing: 0.22,
      wear: 0.3,
    },
  },
]
