import { useEffect, useRef } from "react"
import { StampRenderer } from "@/lib/stamp-renderer"
import { defaultSettings, type StampSettings } from "@/lib/settings"

const logoSettings: StampSettings = {
  ...defaultSettings,
  format: "portrait",
  size: 0.94,
  gauge: 12.5,
  holeSize: 0.28,
  toning: 0.3,
  foxing: 0.08,
  wear: 0.12,
  frame: "classic",
  country: "Stamp",
  denomination: "1¢",
  caption: "",
  margin: 0.08,
  postmarkOn: false,
  peelAmount: 0,
  shadow: 0.2,
  background: "transparent",
}

/** Live render of a stamp beside the wordmark; it tilts toward the pointer. */
export function StampLogo({ follow = true }: { follow?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const followRef = useRef(follow)

  useEffect(() => {
    followRef.current = follow
  }, [follow])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const renderer = new StampRenderer(canvas)

    let raf = 0
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(canvas.clientWidth * dpr)
      const h = Math.round(canvas.clientHeight * dpr)
      if (w > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w
        canvas.height = h
      }
      renderer.render({ settings: logoSettings })
      raf = requestAnimationFrame(draw)
    }
    draw()

    const onMove = (e: PointerEvent) => {
      if (!followRef.current) return renderer.setTilt(0, 0)
      const rect = canvas.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      renderer.setTilt(
        Math.max(-1, Math.min(1, (e.clientX - cx) / 500)),
        Math.max(-1, Math.min(1, (cy - e.clientY) / 500)),
      )
    }
    window.addEventListener("pointermove", onMove)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("pointermove", onMove)
    }
  }, [])

  return (
    <div className="flex items-center gap-2">
      <canvas
        ref={canvasRef}
        aria-hidden
        className="size-14 shrink-0 touch-none"
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold tracking-tight">Stamp Studio</p>
        <p className="text-xs text-muted-foreground">
          Print, perforate, cancel
        </p>
      </div>
    </div>
  )
}
