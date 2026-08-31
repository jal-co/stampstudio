import { useEffect, useState } from "react"

import { loadStampFonts } from "@/lib/fonts"
import { defaultSettings } from "@/lib/settings"
import { buildStampMaps } from "@/lib/stamp-texture"
import type { Template } from "@/lib/templates"

/** Baked previews, kept for the life of the tab. */
const cache = new Map<string, string>()
/** One bake at a time, so opening the sidebar does not stall the canvas. */
let queue: Promise<unknown> = Promise.resolve()

async function bake(t: Template): Promise<string> {
  const hit = cache.get(t.id)
  if (hit) return hit
  await loadStampFonts()
  const blob = await (await fetch(t.image)).blob()
  const art = await createImageBitmap(blob)
  const maps = buildStampMaps({ ...defaultSettings, ...t.patch }, art)
  art.close()
  // the bake is a flat plate: no curl, no shading, which is what a preview
  // wants anyway
  const out = document.createElement("canvas")
  const scale = 260 / Math.max(maps.color.width, maps.color.height)
  out.width = Math.round(maps.color.width * scale)
  out.height = Math.round(maps.color.height * scale)
  const ctx = out.getContext("2d")!
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(maps.color, 0, 0, out.width, out.height)
  const url = out.toDataURL("image/png")
  cache.set(t.id, url)
  return url
}

/** The stamp a template makes, baked from its own photograph and plates. */
export function TemplatePreview({ template }: { template: Template }) {
  const [src, setSrc] = useState<string | null>(cache.get(template.id) ?? null)

  useEffect(() => {
    if (src) return
    let live = true
    queue = queue
      .then(() => bake(template))
      .then((url) => {
        if (live) setSrc(url)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [template, src])

  return (
    <span className="flex aspect-square items-center justify-center overflow-hidden bg-[color-mix(in_oklab,var(--color-muted)_55%,transparent)] p-2">
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
  )
}
