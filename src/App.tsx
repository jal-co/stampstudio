import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryStates } from "nuqs"
import { ChevronDown, History, Moon, Sun } from "lucide-react"
import { DropdownMenu } from "radix-ui"
import { Analytics } from "@vercel/analytics/react"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChangelogDialog } from "@/components/ChangelogDialog"
import {
  GifExportDialog,
  type AnimExportOpts,
  type AnimResult,
} from "@/components/GifExportDialog"
import { currentVersion } from "@/lib/changelog"
import { Sidebar } from "@/components/Sidebar"
import { StampCanvas } from "@/components/StampCanvas"
import { track } from "@/lib/analytics"
import { loadImageFile, loadImageUrl } from "@/lib/load-image"
import { templates, type PhotoCredit, type Template } from "@/lib/templates"
import type { StampRenderer } from "@/lib/stamp-renderer"
import { defaultSettings, type StampSettings } from "@/lib/settings"
import { artParsers, useStampSettings } from "@/lib/url-settings"

/** File name for an export: the artwork name, or the printed country line. */
function stampName(imageName: string | null, s: StampSettings) {
  const base =
    imageName?.replace(/\.[^.]+$/, "") ||
    (s.designOn && s.country ? s.country : "stamp")
  return `${base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-stamp`
}

export default function App() {
  // the stamp lives in the query string, so a design is a link
  const [settings, setSettings] = useStampSettings()
  const [artSource, setArtSource] = useQueryStates(artParsers, {
    history: "replace",
  })
  const [image, setImage] = useState<ImageBitmap | null>(null)
  const [imageName, setImageName] = useState<string | null>(null)
  const [credit, setCredit] = useState<PhotoCredit | null>(null)
  const [exporting, setExporting] = useState(false)
  const [gifProgress, setGifProgress] = useState<number | null>(null)
  const [gifDialogOpen, setGifDialogOpen] = useState(false)
  const [gifResult, setGifResult] = useState<AnimResult | null>(null)
  const [gifFormat, setGifFormat] = useState<"gif" | "video">("gif")
  const [gifShareHint, setGifShareHint] = useState<"drag" | "paste" | null>(
    null,
  )
  const [changelogOpen, setChangelogOpen] = useState(false)
  const [tiltLocked, setTiltLocked] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [dark, setDark] = useState(
    () =>
      (localStorage.getItem("stampstudio-theme") ??
        (matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light")) === "dark",
  )

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    localStorage.setItem("stampstudio-theme", dark ? "dark" : "light")
  }, [dark])

  // "D" toggles dark mode, "L" locks canvas rotation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      const t = e.target as HTMLElement | null
      // only fire on the page background, never while a control has focus
      if (
        t &&
        t.closest(
          "input, textarea, select, button, [role=menu], [role=listbox], [contenteditable]",
        )
      )
        return
      const key = e.key.toLowerCase()
      if (key === "d") {
        e.preventDefault()
        setDark((d) => !d)
      }
      if (key === "l") {
        e.preventDefault()
        setTiltLocked((l) => !l)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  const rendererRef = useRef<StampRenderer | null>(null)

  const patch = useCallback(
    (p: Partial<StampSettings>) => setSettings((s) => ({ ...s, ...p })),
    [],
  )

  // a preset is a whole look, so it replaces the sheet instead of layering
  // onto whatever the sliders were left at
  // a template is a preset plus the photograph it was designed around
  const applyTemplate = useCallback(async (t: Template) => {
    try {
      const loaded = await loadImageUrl(t.image, `${t.label}.jpg`)
      setImage(loaded.bitmap)
      setImageName(loaded.name)
      setCredit(t.credit)
      setSettings({ ...defaultSettings, ...t.patch })
      setArtSource({ template: t.id, art: null })
      track("template_applied", { template: t.id })
    } catch {
      alert("Could not load that template photograph.")
    }
  }, [])

  // Artwork named by the URL. A template arriving this way contributes its
  // photograph only: its patch is deliberately not applied, because the query
  // string already carries whatever the sender had set, and replaying the
  // patch on top would overwrite it.
  const artLoaded = useRef(false)
  useEffect(() => {
    if (artLoaded.current) return
    artLoaded.current = true
    const { template: id, art: url } = artSource
    if (!id && !url) return
    void (async () => {
      try {
        if (id) {
          const t = templates.find((x) => x.id === id)
          if (!t) return
          const loaded = await loadImageUrl(t.image, `${t.label}.jpg`)
          setImage(loaded.bitmap)
          setImageName(loaded.name)
          setCredit(t.credit)
          return
        }
        const loaded = await loadImageUrl(url!, "artwork")
        setImage(loaded.bitmap)
        setImageName(loaded.name)
      } catch {
        // a host that does not allow cross-origin reads, or a dead link. The
        // stamp still renders, just without a picture in it.
        console.warn("Could not load the artwork this link points at:", url ?? id)
      }
    })()
  }, [artSource])

  const handleUpload = useCallback(async (file: File) => {
    try {
      const loaded = await loadImageFile(file)
      setImage(loaded.bitmap)
      setImageName(loaded.name)
      setCredit(null)
      // an uploaded file has no address, so drop any artwork the URL named
      // rather than leaving a link that points at the wrong picture
      setArtSource({ template: null, art: null })
    } catch {
      alert("Could not load that file. Try an SVG, PNG, JPG, or WebP.")
    }
  }, [])

  const handleExport = useCallback(async () => {
    const renderer = rendererRef.current
    if (!renderer) return
    setExporting(true)
    try {
      const blob = await renderer.exportPNG({ settings, keepTilt: tiltLocked })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${stampName(imageName, settings)}.png`
      a.click()
      track("stamp_exported", {
        format: "png",
        size: settings.exportSize,
        edge: settings.edge,
        print: settings.print,
        hasArtwork: imageName !== null,
      })
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }, [settings, imageName, tiltLocked])

  const handleRemoveImage = useCallback(() => {
    setImage(null)
    setImageName(null)
    setCredit(null)
    setArtSource({ template: null, art: null })
  }, [])

  const handleExportSettings = useCallback(() => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "stampstudio-settings.json"
    a.click()
    URL.revokeObjectURL(url)
  }, [settings])

  const encodeAnim = useCallback(
    async (opts: AnimExportOpts): Promise<AnimResult | null> => {
      const renderer = rendererRef.current
      if (!renderer) return null
      const onProgress = (done: number, total: number) =>
        setGifProgress(Math.round((done / total) * 100))
      const common = {
        settings,
        anim: opts.anim,
        background: opts.background,
        speed: opts.speed,
        onProgress,
      }
      if (opts.format === "video") {
        const { blob, extension } = await renderer.exportVideo(common)
        return {
          url: URL.createObjectURL(blob),
          filename: `${stampName(imageName, settings)}.${extension}`,
          kind: "video",
        }
      }
      const blob = await renderer.exportGIF(common)
      return {
        url: URL.createObjectURL(blob),
        filename: `${stampName(imageName, settings)}.gif`,
        kind: "gif",
      }
    },
    [settings, imageName],
  )

  const handleExportAnim = useCallback(
    async (opts: AnimExportOpts) => {
      setExporting(true)
      try {
        // encoding outlives the click's user activation, so downloads are
        // gesture-driven from the result view instead of automatic
        const result = await encodeAnim(opts)
        if (result) {
          setGifResult((prev) => {
            if (prev) URL.revokeObjectURL(prev.url)
            return result
          })
          // attempt the download; if the browser drops it because the
          // click's activation expired, the Save button is right there
          const a = document.createElement("a")
          a.href = result.url
          a.download = result.filename
          a.click()
        }
      } finally {
        setExporting(false)
        setGifProgress(null)
      }
    },
    [encodeAnim],
  )

  const handleShareAnim = useCallback(
    async (opts: AnimExportOpts) => {
      const text =
        "Just printed a postage stamp with Stamp Studio \u2709\ufe0f by @jalcowastaken"
      const url = "https://stampstud.io"
      const isMobile =
        /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && matchMedia("(pointer: coarse)").matches)
      if (image) {
        setExporting(true)
        try {
          // reuse the already-encoded file when one is showing
          const result =
            gifResult && gifResult.kind === opts.format
              ? gifResult
              : await encodeAnim(opts)
          if (result && result !== gifResult) {
            setGifResult((prev) => {
              if (prev) URL.revokeObjectURL(prev.url)
              return result
            })
          }
          if (result && isMobile) {
            // mobile share sheets can hand the file straight to the X app
            const blob = await (await fetch(result.url)).blob()
            const file = new File([blob], result.filename, {
              type: result.kind === "gif" ? "image/gif" : "video/mp4",
            })
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({ files: [file], text: `${text} ${url}` })
              return
            }
          }
          // desktop: X's web intent cannot carry media and the macOS share
          // sheet has no X target. Try the clipboard (the composer accepts
          // pasted images), otherwise hint to drag the saved file in.
          let hint: "drag" | "paste" = "drag"
          if (result) {
            try {
              const blob = await (await fetch(result.url)).blob()
              await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob }),
              ])
              hint = "paste"
            } catch {
              // clipboard cannot carry this type; drag it is
            }
          }
          setGifShareHint(hint)
        } catch (err) {
          console.warn("[share] failed", err)
          // fall through to the plain intent
        } finally {
          setExporting(false)
          setGifProgress(null)
        }
      }
      window.open(
        `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&related=jalcowastaken`,
        "_blank",
        "noopener",
      )
    },
    [image, gifResult, encodeAnim],
  )

  const handleExportGLB = useCallback(async () => {
    const renderer = rendererRef.current
    if (!renderer) return
    setExporting(true)
    try {
      const blob = await renderer.exportGLB({ settings })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${stampName(imageName, settings)}.glb`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }, [settings, imageName])

  const handleImportSettings = useCallback(async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Partial<StampSettings>
      // only accept known keys so a foreign JSON can't inject junk
      const patchObj: Partial<StampSettings> = {}
      for (const key of Object.keys(defaultSettings) as (keyof StampSettings)[]) {
        if (key in parsed) {
          ;(patchObj as Record<string, unknown>)[key] = parsed[key]
        }
      }
      setSettings({ ...defaultSettings, ...patchObj })
    } catch {
      alert("Could not read that settings file.")
    }
  }, [])

  const handleRendererReady = useCallback((r: StampRenderer) => {
    rendererRef.current = r
  }, [])

  return (
    <div className="flex h-dvh flex-col-reverse overflow-hidden bg-background text-foreground md:flex-row">
      <Sidebar
        settings={settings}
        imageName={imageName}
        onChange={patch}
        onTemplate={(t) => void applyTemplate(t)}
        onUpload={handleUpload}
        onRemove={handleRemoveImage}
        onExportSettings={handleExportSettings}
        onImportSettings={handleImportSettings}
        onReset={() => setSettings(defaultSettings)}
      />
      <main
        className="relative flex h-[52dvh] min-w-0 shrink-0 flex-col md:h-auto md:flex-1"
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return
          setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files?.[0]
          if (f) void handleUpload(f)
        }}
      >
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-sidebar px-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title="Toggle dark mode (D)"
            onClick={() => setDark((d) => !d)}
          >
            {dark ? <Sun aria-hidden /> : <Moon aria-hidden />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setChangelogOpen(true)}
          >
            <History aria-hidden />
            v{currentVersion}
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Select
            value={String(settings.exportSize)}
            onValueChange={(v) => patch({ exportSize: Number(v) })}
          >
            <SelectTrigger aria-label="Export size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1024">1024 × 1024</SelectItem>
              <SelectItem value="2048">2048 × 2048</SelectItem>
              <SelectItem value="4096">4096 × 4096</SelectItem>
            </SelectContent>
          </Select>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button disabled={!image || exporting}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-4"
                    aria-hidden="true"
                  >
                    <path fillRule="evenodd" clipRule="evenodd" d="M3.75 14C4.16421 14 4.5 14.3358 4.5 14.75V18.25C4.5 18.9404 5.05964 19.5 5.75 19.5H18.25C18.9404 19.5 19.5 18.9404 19.5 18.25V14.75C19.5 14.3358 19.8358 14 20.25 14C20.6642 14 21 14.3358 21 14.75V18.25C21 19.7688 19.7688 21 18.25 21H5.75C4.23122 21 3 19.7688 3 18.25V14.75C3 14.3358 3.33579 14 3.75 14Z" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 15.75C12.1989 15.75 12.3897 15.671 12.5303 15.5303L16.0303 12.0303C16.3232 11.7374 16.3232 11.2626 16.0303 10.9697C15.7374 10.6768 15.2626 10.6768 14.9697 10.9697L12.75 13.1893V3.75C12.75 3.33579 12.4142 3 12 3C11.5858 3 11.25 3.33579 11.25 3.75V13.1893L9.03033 10.9697C8.73744 10.6768 8.26256 10.6768 7.96967 10.9697C7.67678 11.2626 7.67678 11.7374 7.96967 12.0303L11.4697 15.5303C11.6103 15.671 11.8011 15.75 12 15.75Z" />
                  </svg>
                  {gifProgress !== null
                    ? `GIF ${gifProgress}%`
                    : exporting
                      ? "Exporting…"
                      : "Export"}
                  <ChevronDown className="opacity-60" aria-hidden />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="z-50 min-w-44 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
                >
                  <DropdownMenu.Item
                    onSelect={() => void handleExport()}
                    className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 text-muted-foreground" aria-hidden="true">
                      <path fillRule="evenodd" clipRule="evenodd" d="M18.798 15.5765C18.614 15.5299 18.4251 15.5189 18.2978 15.5269C17.7041 15.564 16.9054 16.2667 16.9054 17.561C16.9054 18.8392 17.6295 19.4975 18.3957 19.5C18.8281 19.4938 19.2307 19.3873 19.5 19.2133V18.5834H19.1961C18.7819 18.5834 18.4461 18.2476 18.4461 17.8334C18.4461 17.4192 18.7819 17.0834 19.1961 17.0834H20.25C20.6642 17.0834 21 17.4192 21 17.8334V19.5538C21 19.7386 20.9318 19.9168 20.8085 20.0544C20.1617 20.7761 19.1466 20.9908 18.4095 20.9999L18.4001 21.0001C16.5623 21.0001 15.4054 19.4058 15.4054 17.561C15.4054 15.7297 16.5885 14.1308 18.2043 14.0298C18.4763 14.0128 18.8215 14.0351 19.1659 14.1223C19.5045 14.2079 19.9079 14.373 20.2262 14.691C20.5192 14.9837 20.5195 15.4586 20.2267 15.7516C19.934 16.0447 19.4591 16.0449 19.166 15.7522C19.1074 15.6935 18.9879 15.6245 18.798 15.5765Z" />
                      <path fillRule="evenodd" clipRule="evenodd" d="M3 14.75C3 14.3358 3.33579 14 3.75 14H5.5C6.74264 14 7.75 15.0074 7.75 16.25C7.75 17.4926 6.74264 18.5 5.5 18.5H4.5V20.25C4.5 20.6642 4.16421 21 3.75 21C3.33579 21 3 20.6642 3 20.25V14.75ZM4.5 17H5.5C5.91421 17 6.25 16.6642 6.25 16.25C6.25 15.8358 5.91421 15.5 5.5 15.5H4.5V17Z" />
                      <path fillRule="evenodd" clipRule="evenodd" d="M8.75 14.75C8.75 14.3358 9.08579 14 9.5 14H10C10.2652 14 10.5108 14.1401 10.6457 14.3685L13 18.3527V14.75C13 14.3358 13.3358 14 13.75 14C14.1642 14 14.5 14.3358 14.5 14.75V20.25C14.5 20.6642 14.1642 21 13.75 21H13.25C12.9848 21 12.7392 20.8599 12.6043 20.6315L10.25 16.6473V20.25C10.25 20.6642 9.91421 21 9.5 21C9.08579 21 8.75 20.6642 8.75 20.25V14.75Z" />
                      <path d="M13 3H6.75C5.23122 3 4 4.23122 4 5.75V12H20V10H15.75C14.2312 10 13 8.76878 13 7.25V3Z" />
                      <path d="M19.9803 8.5C19.9072 7.89165 19.6322 7.32159 19.1945 6.88388L16.1161 3.80546C15.6784 3.36775 15.1083 3.09283 14.5 3.01967V7.25C14.5 7.94036 15.0596 8.5 15.75 8.5H19.9803Z" />
                    </svg>
                    PNG image
                    <span className="ml-auto text-xs text-muted-foreground">
                      {settings.exportSize}px
                    </span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => {
                      setGifFormat("gif")
                      setGifDialogOpen(true)
                    }}
                    className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 text-muted-foreground" aria-hidden="true">
                      <path fillRule="evenodd" clipRule="evenodd" d="M2 6.75C2 5.23122 3.23122 4 4.75 4H19.25C20.7688 4 22 5.23122 22 6.75V17.25C22 18.7688 20.7688 20 19.25 20H4.75C3.23122 20 2 18.7688 2 17.25V6.75ZM5.75 12.3676C5.75 14.0113 6.70955 15 8.34036 15C9.79045 15 10.7672 14.138 10.7672 12.8662V12.5155C10.7672 11.9789 10.5176 11.738 9.94966 11.738H8.89544C8.51678 11.738 8.31454 11.9113 8.31454 12.2282C8.31454 12.5493 8.52108 12.7268 8.89544 12.7268H9.4247V12.9718C9.4247 13.5 9.01162 13.8549 8.3963 13.8549C7.60456 13.8549 7.16997 13.3268 7.16997 12.3634V11.6662C7.16997 10.6901 7.59596 10.1789 8.40921 10.1789C8.95193 10.1789 9.27253 10.4939 9.61231 10.8279L9.63554 10.8507C9.76033 10.9732 9.88941 11.0282 10.0572 11.0282C10.3972 11.0282 10.6338 10.8 10.6338 10.4662C10.6338 10.1324 10.3799 9.76901 9.99268 9.49437C9.56239 9.17746 8.97289 9 8.30594 9C6.72246 9 5.75 10.0014 5.75 11.5986V12.3676ZM12.3894 14.9155C12.8412 14.9155 13.0951 14.6451 13.0951 14.1634V9.81549C13.0951 9.33803 12.8369 9.06338 12.3808 9.06338C11.9247 9.06338 11.6708 9.3338 11.6708 9.81549V14.1634C11.6708 14.6408 11.9333 14.9155 12.3894 14.9155ZM15.6596 14.1634C15.6596 14.6451 15.4101 14.9155 14.9626 14.9155C14.5022 14.9155 14.2354 14.6366 14.2354 14.1634V9.90423C14.2354 9.38873 14.5237 9.10563 15.0572 9.10563H17.6863C18.0133 9.10563 18.25 9.34225 18.25 9.67183C18.25 9.99718 18.0133 10.2254 17.6863 10.2254H15.6596V11.6113H17.4669C17.8068 11.6113 18.0306 11.831 18.0306 12.1563C18.0306 12.4817 17.8025 12.7014 17.4669 12.7014H15.6596V14.1634Z" />
                    </svg>
                    GIF animation
                    <span className="ml-auto text-xs text-muted-foreground">
                      loop
                    </span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => {
                      setGifFormat("video")
                      setGifDialogOpen(true)
                    }}
                    className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 text-muted-foreground" aria-hidden="true">
                      <path fillRule="evenodd" clipRule="evenodd" d="M2 6.75C2 5.23122 3.23122 4 4.75 4H19.25C20.7688 4 22 5.23122 22 6.75V17.25C22 18.7688 20.7688 20 19.25 20H4.75C3.23122 20 2 18.7688 2 17.25V6.75ZM10.5 8.75C10.0858 8.75 9.75 9.08579 9.75 9.5V14.5C9.75 14.9142 10.0858 15.25 10.5 15.25C10.6321 15.25 10.762 15.2151 10.8763 15.1489L15.1263 12.6489C15.3555 12.5148 15.5 12.2683 15.5 12C15.5 11.7317 15.3555 11.4852 15.1263 11.3511L10.8763 8.85114C10.762 8.78486 10.6321 8.75 10.5 8.75Z" />
                    </svg>
                    MP4 video
                    <span className="ml-auto text-xs text-muted-foreground">
                      loop
                    </span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => void handleExportGLB()}
                    className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 text-muted-foreground" aria-hidden="true">
                      <path d="M11 12.2883C11.1547 12.3776 11.25 12.5427 11.25 12.7213V21.8166C11.25 22.2015 10.8333 22.4421 10.5 22.2496L3.74807 18.3515C2.89721 17.8603 2.37305 16.9524 2.37305 15.9699V8.17366C2.37305 7.78876 2.78971 7.54819 3.12304 7.74064L11 12.2883Z" />
                      <path d="M21.627 15.9699C21.627 16.9524 21.1028 17.8603 20.2519 18.3515L13.5 22.2496C13.1667 22.4421 12.75 22.2015 12.75 21.8166V12.7213C12.75 12.5427 12.8453 12.3776 13 12.2883L20.877 7.74064C21.2103 7.5482 21.627 7.78876 21.627 8.17366V15.9699Z" />
                      <path d="M20.1261 5.57581C20.4594 5.76826 20.4594 6.24936 20.1261 6.44181L12.25 10.9895C12.0953 11.0788 11.9047 11.0788 11.75 10.9895L3.87307 6.44183C3.53973 6.24938 3.53973 5.76825 3.87307 5.5758L10.6249 1.67768C11.4758 1.18644 12.5242 1.18646 13.375 1.67775L20.1261 5.57581Z" />
                    </svg>
                    GLB 3D model
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>
        <div
          aria-hidden
          className={
            "pointer-events-none absolute inset-4 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-ring/60 bg-background/60 transition-opacity duration-150 ease-out " +
            (dragging ? "opacity-100" : "opacity-0")
          }
        >
          <p className="text-sm font-medium text-muted-foreground">
            Drop artwork to print
          </p>
        </div>
        <div className="min-h-0 flex-1">
          <StampCanvas
            image={image}
            settings={settings}
            tiltLocked={tiltLocked}
            onRendererReady={handleRendererReady}
          />
        </div>
        {credit && (
          <p className="absolute bottom-4 left-1/2 max-w-[80%] -translate-x-1/2 truncate text-center text-[11px] text-muted-foreground">
            Photo:{" "}
            <a
              href={credit.source}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {credit.title}
            </a>{" "}
            by{" "}
            <a
              href={credit.creatorUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {credit.creator}
            </a>{" "}
            <a
              href={credit.licenseUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {credit.license}
            </a>
          </p>
        )}
        <button
          type="button"
          onClick={() => setTiltLocked((l) => !l)}
          className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-[color,background-color] hover:bg-accent hover:text-foreground"
        >
          <Kbd>L</Kbd>
          {tiltLocked ? "Rotation locked" : "Lock rotation"}
        </button>
        {/* handwritten "follow me on x" note + arrow pointing at the pill */}
        {/* handwritten note; the arrow tip lands on the X icon in the pill */}
        <a
          href="https://x.com/jalcowastaken"
          target="_blank"
          rel="noreferrer"
          aria-label="Follow jalcowastaken on X"
          className="group absolute bottom-16 right-[5.5rem] hidden flex-col items-end select-none text-orange-500 transition-colors hover:text-orange-700 md:flex"
        >
          <span
            className="block -rotate-6 pr-8 text-lg transition-transform group-hover:-rotate-3 group-hover:scale-105"
            style={{
              fontFamily: '"Bradley Hand", "Segoe Script", "Comic Sans MS", cursive',
            }}
          >
            follow me on x
          </span>
          <svg
            viewBox="0 0 48 40"
            width="48"
            height="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="-mr-4 transition-transform group-hover:translate-y-0.5"
          >
            <path d="M6 4c18 4 32 14 36 30" />
            <path d="M35 28l7 7 3-10" />
          </svg>
        </a>
        <div className="absolute right-4 bottom-4 flex items-center gap-0.5 rounded-full border bg-background/80 p-1 shadow-sm backdrop-blur">
          <a
            href="https://x.com/jalcowastaken"
            target="_blank"
            rel="noreferrer"
            aria-label="Follow jalcowastaken on X"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-[color,background-color] hover:bg-accent hover:text-foreground"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
            </svg>
          </a>
          <a
            href="https://github.com/jal-co/stampstudio"
            target="_blank"
            rel="noreferrer"
            aria-label="View source on GitHub"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-[color,background-color] hover:bg-accent hover:text-foreground"
          >
            <svg
              viewBox="0 0 16 16"
              width="18"
              height="18"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </a>
        </div>
      </main>
      <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
      <GifExportDialog
        open={gifDialogOpen}
        onOpenChange={(o) => {
          if (!exporting && gifProgress === null) {
            setGifDialogOpen(o)
            if (!o) {
              setGifShareHint(null)
              setGifResult((prev) => {
                if (prev) URL.revokeObjectURL(prev.url)
                return null
              })
            }
          }
        }}
        image={image}
        settings={settings}
        progress={gifProgress}
        initialFormat={gifFormat}
        result={gifResult}
        shareHint={gifShareHint}
        onClearResult={() => {
          setGifShareHint(null)
          setGifResult((prev) => {
            if (prev) URL.revokeObjectURL(prev.url)
            return null
          })
        }}
        onExport={(opts) => void handleExportAnim(opts)}
        onShare={(opts) => void handleShareAnim(opts)}
      />
      <Analytics />
    </div>
  )
}
