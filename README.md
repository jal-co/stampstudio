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

> This is a fork of [jal-co/stampstudio](https://github.com/jal-co/stampstudio)
> adding URL state and a variations strip. The fork deploys to
> [bhaumikmistry.github.io/stampstudio-bk](https://bhaumikmistry.github.io/stampstudio-bk/)
> on every push to `main`. Everything else is upstream's work.

## Features

- **Perforations** punched from a signed distance field: gauge 7 to 16, adjustable hole size, and torn fibre on the teeth. Also wavy self-adhesive die-cuts, roulettes, and imperforate edges
- **Paper** rendered as a rough dielectric in GLSL: laid fibre, an impressed watermark, toning, foxing blooms, handling creases, and a gummed back the print shows through
- **Four presses** that re-separate the artwork as they print it: engraved, offset, photogravure, and typeset, with intaglio relief that stands off the sheet
- **Vignettes** in arch, oval, circle, or rectangle, with a feathered edge, ruled on their own plate in their own colour
- **Stamp furniture**: frame styles, corner ornaments, a curved country line, corner value tablets with the numeral knocked out, and ribbon captions
- **Six bundled faces** cut for stamp work, from Libre Baskerville to Pinyon Script
- **Cancellation**: duplex postmark with killer bars and an editable circular datestamp, placed and angled anywhere on the face
- **Six templates** built on Creative Commons photographs, each loading a picture and the plates designed around it
- Pointer tilt, a corner lift with graded curl, and dark mode (press <kbd>D</kbd>)
- Save and import settings as JSON; export PNG at 1024 / 2048 / 4096 with transparency, plus GIF, MP4, and GLB
- **The stamp is in the URL**, so a design is a link. Only what you changed is written, artwork comes from `art=<url>` or `template=<id>`, and the sidebar offers four treatments of any picture you load. See [docs/url-parameters.md](docs/url-parameters.md)

## Templates

Six finished stamps, each a photograph with the plates designed around it.
The pictures are Creative Commons, found through
[Openverse](https://openverse.org), and bundled in `public/templates` so the
bake never depends on someone else's CDN. Every one keeps its credit on the
canvas and here.

| Template | Photograph | Photographer | Licence |
| --- | --- | --- | --- |
| Beacon | [Lighthouse](https://www.flickr.com/photos/50276595@N03/8486376375) | [Kenneth Moore Photography](https://www.flickr.com/photos/50276595@N03) | CC BY 2.0 |
| National park | [Hallet Peak, Rocky Mountain N.P.](https://www.flickr.com/photos/55608722@N06/6314607981) | [Dusty J](https://www.flickr.com/photos/55608722@N06) | CC BY 2.0 |
| Wildlife | [The River Wey Navigation, heron hiding](https://www.flickr.com/photos/40837632@N05/9614062433) | [Gareth1953 All Right Now](https://www.flickr.com/photos/40837632@N05) | CC BY 2.0 |
| Maritime | [A Calm at a Mediterranean Port, the sailing ship (detail)](https://www.flickr.com/photos/46042146@N00/2711066783) | [Randy Son Of Robert](https://www.flickr.com/photos/46042146@N00) | CC BY 2.0 |
| Botanical | [The blue bell is the sweetest flower](https://www.flickr.com/photos/37072378@N08/17714873202) | [Orchids love rainwater](https://www.flickr.com/photos/37072378@N08) | CC BY 2.0 |
| Engineering | [West Garfield Street Bridge, 1929](https://www.flickr.com/photos/24256351@N04/4257832624) | [Seattle Municipal Archives](https://www.flickr.com/photos/24256351@N04) | CC BY 2.0 |

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
