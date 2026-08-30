# Stamp Studio

<p>
  <a href="https://stampstud.io"><img alt="Website" src="https://shieldcn.dev/badge/stampstud.io-live-1d3f6e.svg?size=xs&variant=secondary&logo=vercel" /></a>
  <a href="https://github.com/jal-co/stampstudio/releases"><img alt="Release" src="https://shieldcn.dev/github/v/release/jal-co/stampstudio.svg?size=xs&variant=secondary" /></a>
  <a href="https://github.com/jal-co/stampstudio/stargazers"><img alt="GitHub stars" src="https://shieldcn.dev/github/stars/jal-co/stampstudio.svg?size=xs&variant=secondary" /></a>
  <a href="https://github.com/jal-co/stampstudio/blob/main/LICENSE"><img alt="License" src="https://shieldcn.dev/github/license/jal-co/stampstudio.svg?size=xs&variant=secondary" /></a>
  <a href="https://github.com/jal-co/stampstudio/commits/main"><img alt="Last commit" src="https://shieldcn.dev/github/last-commit/jal-co/stampstudio.svg?size=xs&variant=secondary" /></a>
  <a href="https://github.com/sponsors/jal-co"><img alt="Sponsor" src="https://shieldcn.dev/badge/sponsor-%E2%9D%A4-ec4899.svg?size=xs&variant=secondary&logo=githubsponsors" /></a>
</p>

An online, open source stamp creator. Upload artwork, set the perforation gauge, age the paper, strike a postmark, and export a postage stamp as a transparent PNG.

**Live at [stampstud.io](https://stampstud.io)**

## Features

- **Perforations** punched from a signed distance field: gauge 7 to 16, adjustable hole size, and torn fibre on the teeth. Also wavy self-adhesive die-cuts, roulettes, and imperforate edges
- **Paper** rendered as a rough dielectric in GLSL: laid fibre, an impressed watermark, toning, foxing blooms, handling creases, and a gummed back the print shows through
- **Four presses** that re-separate the artwork as they print it: engraved, offset, photogravure, and typeset, with intaglio relief that stands off the sheet
- **Vignettes** in arch, oval, circle, or rectangle, with a feathered edge, ruled on their own plate in their own colour
- **Stamp furniture**: frame styles, corner ornaments, a curved country line, corner value tablets with the numeral knocked out, and ribbon captions
- **Six bundled faces** cut for stamp work, from Libre Baskerville to Pinyon Script
- **Cancellation**: duplex postmark with killer bars and an editable circular datestamp, placed and angled anywhere on the face
- **Eight presets**, from the 1922 high values to a modern self-adhesive
- Pointer tilt, a corner lift with graded curl, and dark mode (press <kbd>D</kbd>)
- Save and import settings as JSON; export PNG at 1024 / 2048 / 4096 with transparency, plus GIF, MP4, and GLB

## Run

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` if you want analytics locally. Nothing is
sent without a client id, and analytics only initialise in production builds.

| Variable | Required | What it does |
| --- | --- | --- |
| `VITE_OPENPANEL_CLIENT_ID` | No | OpenPanel project client id. Public by design, and baked into the bundle at build time |

## How it works

Every sheet is baked in two passes. `src/lib/stamp-texture.ts` draws the paper,
the artwork, the frame and the lettering onto a 2D canvas, then resolves the cut
line from a signed distance field so perforations punch real holes in the alpha
channel. `src/lib/stamp-renderer.ts` takes that canvas into three.js, where a
paper shader adds fibre, edge fibre, and the intaglio relief that makes ink sit
proud of the sheet.

The renderer began as a fork of [Holosticker](https://holosticker.dev), which
shares the distance-field die-cut, the curl geometry, and the exporters.

## Stack

Vite, React, TypeScript, Tailwind CSS v4, shadcn/ui, Intent UI colour
primitives, three.js. Deployed on Vercel.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Every user-facing change needs a
changeset, and `npx tsc -b` and `npm run build` must pass.

## Licence

MIT. See [LICENSE](LICENSE).

Bundled typefaces ship under the SIL Open Font License: Libre Baskerville,
Playfair Display, Cinzel, Oswald, Special Elite, and Pinyon Script.

## Support

If Stamp Studio is useful to you, consider [sponsoring jal-co on GitHub](https://github.com/sponsors/jal-co).

<a href="https://github.com/sponsors/jal-co"><img alt="Sponsors" src="https://shieldcn.dev/sponsors/jal-co.svg?bg=transparent" /></a>
