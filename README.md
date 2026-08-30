# Stamp Studio

<p>
  <a href="https://stampstud.io"><img alt="Website" src="https://shieldcn.dev/badge/stampstud.io-live-1d3f6e.svg?size=xs&variant=secondary&logo=vercel" /></a>
  <a href="https://github.com/jal-co/stampstudio/stargazers"><img alt="GitHub stars" src="https://shieldcn.dev/github/stars/jal-co/stampstudio.svg?size=xs&variant=secondary" /></a>
  <a href="https://github.com/jal-co/stampstudio/blob/main/LICENSE"><img alt="License" src="https://shieldcn.dev/github/license/jal-co/stampstudio.svg?size=xs&variant=secondary" /></a>
  <a href="https://github.com/jal-co/stampstudio/commits/main"><img alt="Last commit" src="https://shieldcn.dev/github/last-commit/jal-co/stampstudio.svg?size=xs&variant=secondary" /></a>
  <a href="https://github.com/sponsors/jal-co"><img alt="Sponsor" src="https://shieldcn.dev/badge/sponsor-%E2%9D%A4-ec4899.svg?size=xs&variant=secondary&logo=githubsponsors" /></a>
</p>

An online, open source stamp creator. Upload artwork, set the perforation gauge, age the paper, strike a postmark, and export a postage stamp as a transparent PNG.

**Live at [stampstud.io](https://stampstud.io)**

## Features

- Real-time three.js rendering: paper as a rough dielectric with laid fibre, an impressed watermark, and ink that stands off the sheet the way an intaglio plate leaves it
- Perforations punched from a signed distance field: any gauge from 7 to 16, adjustable hole size, and torn fibre on the teeth. Also wavy self-adhesive die-cuts, roulettes, and imperforate edges
- Four presses: engraved, offset, photogravure, and typeset. Each re-separates the uploaded artwork and changes how the ink catches the light
- Stamp furniture: frame styles, country line, denomination, and caption, all editable and printed in the ink colour
- Cancellation: duplex postmark with killer bars and a circular datestamp you can rotate and place anywhere on the face
- Ageing: toning, foxing blooms, handling creases, and a gummed back where the print shows through
- Pointer tilt and a corner lift with graded curl
- Dark mode (toggle in the toolbar, or press <kbd>D</kbd>)
- Save / import settings as JSON; export PNG at 1024 / 2048 / 4096 with transparency, plus GIF, MP4, and GLB

## Run

```sh
npm install
npm run dev
```

## Stack

Vite, React, TypeScript, Tailwind CSS v4, shadcn/ui, three.js. Deployed on Vercel.

## Deploy

The app is a static Vite build - Vercel auto-detects it:

```sh
vercel --prod
```

## Support

If Stamp Studio is useful to you, consider [sponsoring jal-co on GitHub](https://github.com/sponsors/jal-co).

<a href="https://github.com/sponsors/jal-co"><img alt="Sponsors" src="https://shieldcn.dev/sponsors/jal-co.svg?bg=transparent" /></a>
