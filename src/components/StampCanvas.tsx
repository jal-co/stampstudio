import { useEffect, useRef } from "react"
import { StampRenderer } from "@/lib/stamp-renderer"
import type { StampSettings } from "@/lib/settings"
import { cn } from "@/lib/utils"

interface Props {
  image: ImageBitmap | null
  settings: StampSettings
  /** When true, pointer movement no longer tilts the stamp. */
  tiltLocked?: boolean
  onRendererReady: (r: StampRenderer) => void
}

const bgClass: Record<StampSettings["background"], string> = {
  transparent:
    "bg-[length:24px_24px] bg-[image:repeating-conic-gradient(oklch(0.94_0_0)_0%_25%,white_0%_50%)] dark:bg-[image:repeating-conic-gradient(oklch(0.24_0_0)_0%_25%,oklch(0.2_0_0)_0%_50%)]",
  white: "bg-white",
  black: "bg-black",
}

export function StampCanvas({
  image,
  settings,
  tiltLocked = false,
  onRendererReady,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<StampRenderer | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || rendererRef.current) return
    const renderer = new StampRenderer(canvas)
    rendererRef.current = renderer
    onRendererReady(renderer)
  }, [onRendererReady])

  useEffect(() => {
    rendererRef.current?.setImage(image)
  }, [image])

  // continuous loop so the sheen and fibre keep moving with the pointer
  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = rendererRef.current
    if (!canvas || !renderer) return
    let raf = 0
    const draw = () => {
      if (renderer.exporting) {
        raf = requestAnimationFrame(draw)
        return
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(canvas.clientWidth * dpr)
      const h = Math.round(canvas.clientHeight * dpr)
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w
        canvas.height = h
      }
      renderer.render({ settings })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [settings, image])

  return (
    <div
      className={cn(
        "relative size-full overflow-hidden",
        bgClass[settings.background],
      )}
    >
      <canvas
        ref={canvasRef}
        className="size-full touch-none"
        onPointerMove={(e) => {
          if (tiltLocked) return
          const rect = e.currentTarget.getBoundingClientRect()
          rendererRef.current?.setTilt(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            1 - ((e.clientY - rect.top) / rect.height) * 2,
          )
        }}
      />
    </div>
  )
}
