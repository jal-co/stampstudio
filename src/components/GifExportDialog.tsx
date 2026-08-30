import { useEffect, useRef, useState } from "react"
import { Dialog } from "radix-ui"
import { Clapperboard, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { gifPeelPose, StampRenderer, type GifAnim } from "@/lib/stamp-renderer"
import type { StampSettings } from "@/lib/settings"
import { cn } from "@/lib/utils"

type GifBackground = "transparent" | "white" | "black"
export type AnimFormat = "gif" | "video"

export interface AnimExportOpts {
  format: AnimFormat
  anim: GifAnim
  background: GifBackground
  speed: number
}

export interface AnimResult {
  url: string
  filename: string
  kind: AnimFormat
}

const bgClass: Record<GifBackground, string> = {
  transparent:
    "bg-[length:20px_20px] bg-[image:repeating-conic-gradient(oklch(0.94_0_0)_0%_25%,white_0%_50%)] dark:bg-[image:repeating-conic-gradient(oklch(0.24_0_0)_0%_25%,oklch(0.2_0_0)_0%_50%)]",
  white: "bg-white",
  black: "bg-black",
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  image: ImageBitmap | null
  settings: StampSettings
  progress: number | null
  initialFormat: AnimFormat
  /** The finished file, shown for a gesture-driven save. */
  result: AnimResult | null
  /** Set when the file needs manual attachment to the X post. */
  shareHint: "drag" | "paste" | null
  onClearResult: () => void
  onExport: (opts: AnimExportOpts) => void
  onShare: (opts: AnimExportOpts) => void
}

export function GifExportDialog({
  open,
  onOpenChange,
  image,
  settings,
  progress,
  initialFormat,
  result,
  shareHint,
  onClearResult,
  onExport,
  onShare,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<StampRenderer | null>(null)
  const lastImageRef = useRef<ImageBitmap | null | undefined>(undefined)
  const [format, setFormat] = useState<AnimFormat>(initialFormat)
  const [anim, setAnim] = useState<GifAnim>("sweep")
  const [background, setBackground] = useState<GifBackground>("transparent")
  const [speed, setSpeed] = useState(1)

  // follow the entry point (GIF vs MP4 menu item)
  useEffect(() => {
    if (open) setFormat(initialFormat)
  }, [open, initialFormat])

  // video cannot carry transparency
  const effectiveBackground =
    format === "video" && background === "transparent" ? "white" : background

  const opts: AnimExportOpts = {
    format,
    anim,
    background: effectiveBackground,
    speed,
  }

  // live looping preview of the chosen animation
  useEffect(() => {
    if (!open || result) return
    let raf = 0
    const loopMs = (anim === "peel" ? 2880 : 2400) / speed
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const canvas = canvasRef.current
      if (!canvas) return // portal content not mounted yet, retry
      if (!rendererRef.current) {
        rendererRef.current = new StampRenderer(canvas)
      }
      const renderer = rendererRef.current
      if (lastImageRef.current !== image) {
        renderer.setImage(image)
        lastImageRef.current = image
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const size = Math.round(canvas.clientWidth * dpr)
      if (size > 0 && (canvas.width !== size || canvas.height !== size)) {
        canvas.width = size
        canvas.height = size
      }
      if (canvas.width === 0) return
      const t = (performance.now() % loopMs) / loopMs
      let frameSettings = settings
      let flyOff = 0
      if (anim === "sweep") {
        const a = t * Math.PI * 2
        renderer.setTilt(Math.sin(a) * 0.85, Math.cos(a) * 0.55)
      } else {
        renderer.setTilt(0, 0)
        const pose = gifPeelPose(t)
        frameSettings = { ...settings, peelAmount: pose.peel }
        flyOff = pose.fly
      }
      renderer.render({ settings: frameSettings, flyOff })
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [open, result, anim, speed, image, settings])

  const busy = progress !== null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs" />
        <Dialog.Content
          // buttons disable while encoding, which moves focus out of the
          // dialog; without these Radix reads that as a dismissal
          onFocusOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed top-1/2 left-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-4 shadow-lg outline-none"
        >
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold">
              Export animation
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Close"
              >
                <X aria-hidden />
              </Button>
            </Dialog.Close>
          </div>

          <div
            className={cn(
              "relative aspect-square w-full overflow-hidden rounded-lg border",
              bgClass[effectiveBackground],
            )}
          >
            {result ? (
              result.kind === "video" ? (
                <video
                  src={result.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="size-full object-contain"
                />
              ) : (
                <img
                  src={result.url}
                  alt="Finished GIF preview"
                  className="size-full object-contain"
                />
              )
            ) : (
              <canvas ref={canvasRef} className="size-full" />
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Format</Label>
              <Select
                value={format}
                onValueChange={(v) => {
                  onClearResult()
                  setFormat(v as AnimFormat)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gif">GIF</SelectItem>
                  <SelectItem value="video">MP4 video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Animation</Label>
              <Select
                value={anim}
                onValueChange={(v) => {
                  onClearResult()
                  setAnim(v as GifAnim)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sweep">Turn in the light</SelectItem>
                  <SelectItem value="peel">Lift & settle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Background</Label>
              <Select
                value={effectiveBackground}
                onValueChange={(v) => {
                  onClearResult()
                  setBackground(v as GifBackground)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {format !== "video" && (
                    <SelectItem value="transparent">Transparent</SelectItem>
                  )}
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Speed</Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {speed.toFixed(2)}×
                </span>
              </div>
              <Slider
                value={[speed]}
                min={0.5}
                max={2}
                step={0.05}
                onValueChange={([v]) => {
                  onClearResult()
                  setSpeed(v)
                }}
                className="pt-2.5"
              />
            </div>
          </div>

          {result ? (
            <div className="mt-3 flex gap-2">
              <Button className="flex-1" asChild>
                <a href={result.url} download={result.filename}>
                  <Clapperboard aria-hidden />
                  Save {result.kind === "video" ? "video" : "GIF"}
                </a>
              </Button>
              <Button variant="outline" onClick={onClearResult}>
                Re-edit
              </Button>
            </div>
          ) : (
            <Button
              className="mt-3 w-full"
              disabled={busy}
              onClick={() => onExport(opts)}
            >
              <Clapperboard aria-hidden />
              {busy
                ? `Encoding… ${progress}%`
                : `Export ${format === "video" ? "video" : "GIF"}`}
            </Button>
          )}
          <Button
            variant="outline"
            className="mt-2 w-full"
            disabled={busy}
            onClick={() => onShare(opts)}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
            </svg>
            Share on X
          </Button>
          {shareHint && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {shareHint === "paste"
                ? "Copied - paste (\u2318V) into the post to attach it."
                : "Save the file and drag it into the post to attach it."}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
