import { useEffect, useState } from "react"

import { loadStampFonts } from "@/lib/fonts"
import { looks, type Look } from "@/lib/looks"
import type { StampSettings } from "@/lib/settings"
import { buildStampMaps } from "@/lib/stamp-texture"
import { cn } from "@/lib/utils"

/**
 * Four treatments of the artwork that is loaded, baked as flat plates.
 *
 * The bake is the same one `TemplatePreview` uses: `buildStampMaps` with no
 * curl and no shading, which is all a thumbnail needs. It is synchronous and
 * not cheap, so the four go through one shared queue rather than landing on
 * the main thread together and stuttering the canvas behind them.
 */

const cache = new Map<string, string>()
let queue: Promise<unknown> = Promise.resolve()

/** Long edge of the thumbnail bake. The canvas uses 1100. */
const THUMB_TEX = 440

/** Let the browser paint between bakes so four in a row is not one freeze. */
const yieldToPaint = () =>
  new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)))

/** Only the fields a look touches, so typing a country does not rebake. */
function keyFor(look: Look, s: StampSettings, art: string) {
  return [
    look.id,
    art,
    s.format,
    s.size,
    s.edge,
    s.gauge,
    s.margin,
    s.artFit,
    s.artZoom,
    s.designOn,
    s.country,
    s.denomination,
  ].join("|")
}

async function bake(
  look: Look,
  settings: StampSettings,
  art: ImageBitmap,
  key: string,
): Promise<string> {
  const hit = cache.get(key)
  if (hit) return hit
  await loadStampFonts()
  // baked at roughly twice the size it is shown at, which is enough for a
  // retina thumbnail and a fraction of the work of a full-size plate
  const maps = buildStampMaps({ ...settings, ...look.patch }, art, THUMB_TEX)
  const out = document.createElement("canvas")
  const scale = 220 / Math.max(maps.color.width, maps.color.height)
  out.width = Math.round(maps.color.width * scale)
  out.height = Math.round(maps.color.height * scale)
  const ctx = out.getContext("2d")!
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(maps.color, 0, 0, out.width, out.height)
  const url = out.toDataURL("image/png")
  cache.set(key, url)
  return url
}

function Variation({
  look,
  settings,
  art,
  artKey,
  onPick,
}: {
  look: Look
  settings: StampSettings
  art: ImageBitmap
  artKey: string
  onPick: () => void
}) {
  const key = keyFor(look, settings, artKey)
  const [src, setSrc] = useState<string | null>(cache.get(key) ?? null)

  useEffect(() => {
    if (cache.has(key)) {
      setSrc(cache.get(key)!)
      return
    }
    setSrc(null)
    let live = true
    queue = queue
      .then(yieldToPaint)
      .then(() => bake(look, settings, art, key))
      .then((url) => {
        if (live) setSrc(url)
      })
      .catch(() => {})
    return () => {
      live = false
    }
    // settings is read inside the bake, but the key is what decides staleness
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (
    <button
      type="button"
      onClick={onPick}
      title={`Print it ${look.label.toLowerCase()}`}
      className={cn(
        "group flex flex-col gap-1 rounded-lg p-1 text-left transition-colors",
        "hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring",
      )}
    >
      <span className="flex aspect-square items-center justify-center overflow-hidden rounded bg-[color-mix(in_oklab,var(--color-muted)_55%,transparent)] p-1.5">
        {src ? (
          <img
            src={src}
            alt=""
            className="max-h-full max-w-full object-contain drop-shadow-[0_1px_2px_rgb(0_0_0/0.18)]"
          />
        ) : (
          <span className="size-full animate-pulse rounded bg-foreground/5" />
        )}
      </span>
      <span className="truncate px-0.5 text-xs text-muted-foreground group-hover:text-foreground">
        {look.label}
      </span>
    </button>
  )
}

export function Variations({
  settings,
  image,
  imageName,
  onChange,
}: {
  settings: StampSettings
  image: ImageBitmap | null
  imageName: string | null
  onChange: (patch: Partial<StampSettings>) => void
}) {
  if (!image) return null
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">Try it as</span>
      <div className="grid grid-cols-4 gap-1">
        {looks.map((look) => (
          <Variation
            key={look.id}
            look={look}
            settings={settings}
            art={image}
            artKey={imageName ?? "artwork"}
            onPick={() => onChange(look.patch)}
          />
        ))}
      </div>
    </div>
  )
}
