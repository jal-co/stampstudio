import { useState } from "react"
import { Popover } from "radix-ui"
import { Check, ChevronDown, Pipette } from "lucide-react"
import { Input } from "react-aria-components"
import { ColorArea } from "@/components/ui/color-area"
import { ColorField } from "@/components/ui/color-field"
import { ColorPicker } from "@/components/ui/color-picker"
import { ColorSlider, ColorSliderTrack } from "@/components/ui/color-slider"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD
 *
 * Read top-to-bottom. Each `at` value is ms after the click.
 *
 *    0ms   field pressed, chip dips to scale 0.98
 *    0ms   panel mounts under the field, opacity 0, scale 0.96,
 *          origin at the trigger edge, offset -4px toward it
 *  160ms   panel settled: opacity 1, scale 1, offset 0
 *
 * On close the same move runs backwards in 110ms, faster than it
 * opened, because a dismissal should not be waited on.
 *
 * Inside the panel nothing animates: dragging the saturation plane
 * must track the pointer exactly, so any easing there would read as
 * lag rather than polish.
 * ───────────────────────────────────────────────────────── */

const TIMING = {
  panelOpen: 160, // ms, panel fades and scales in
  panelClose: 110, // ms, faster on the way out
}

/* Popover panel */
const PANEL = {
  offset: 6, // px gap between the field and the panel
  width: "w-[17rem]",
  // ease-out on entry so it arrives quickly and settles; ease-in on exit
  enter: "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-1 ease-out",
  exit: "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-top-1",
}

/* Trigger field */
const FIELD = {
  press: "active:scale-[0.99]", // dip on press, no bounce back
  transition: "transition-[color,background-color,border-color,transform] duration-150 ease-out",
}

interface Props {
  label: string
  value: string
  /** Preset inks offered under the picker */
  swatches: string[]
  onChange: (hex: string) => void
}

/** A colour field that opens the picker in a popover when clicked. */
export function ColorPickerField({ label, value, swatches, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const hex = value.toUpperCase()

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-md border border-input bg-transparent px-2 text-xs outline-none",
            "hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            FIELD.transition,
            FIELD.press,
          )}
          aria-label={`${label}, ${hex}`}
        >
          <span
            className="size-4 shrink-0 rounded-[4px] inset-ring-1 inset-ring-black/15"
            style={{ backgroundColor: value }}
          />
          <span className="tabular-nums">{hex}</span>
          <ChevronDown
            className="ml-auto size-3.5 shrink-0 opacity-60"
            aria-hidden
          />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={PANEL.offset}
            style={{
              ["--tw-enter-duration" as string]: `${TIMING.panelOpen}ms`,
            }}
            className={cn(
              "z-50 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg outline-none",
              PANEL.width,
              PANEL.enter,
              PANEL.exit,
              "data-[state=open]:duration-150 data-[state=closed]:duration-100",
              "motion-reduce:animate-none motion-reduce:transition-none",
            )}
          >
            <ColorPicker
              className="w-full"
              value={value}
              onChange={(c) => onChange(c.toString("hex"))}
            >
              <ColorArea
                colorSpace="hsb"
                xChannel="saturation"
                yChannel="brightness"
                className="h-32 w-full rounded-lg"
              />
              <ColorSlider colorSpace="hsb" channel="hue" className="w-full">
                <ColorSliderTrack className="h-3 rounded-full" />
              </ColorSlider>
              <div className="flex items-center gap-2">
                <ColorField aria-label={`${label} hex`} className="flex-1">
                  <Input className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-xs uppercase tabular-nums outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
                </ColorField>
                <EyeDropperButton onPick={onChange} />
              </div>
            </ColorPicker>
            <div
              role="listbox"
              aria-label={`${label} presets`}
              className="mt-3 flex flex-wrap gap-1.5"
            >
              {swatches.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  role="option"
                  aria-selected={preset.toLowerCase() === value.toLowerCase()}
                  aria-label={preset}
                  onClick={() => onChange(preset)}
                  style={{ backgroundColor: preset }}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md inset-ring-1 inset-ring-black/15",
                    "transition-transform duration-150 ease-out hover:scale-105 active:scale-95",
                  )}
                >
                  {preset.toLowerCase() === value.toLowerCase() && (
                    <Check className="size-3.5 text-white drop-shadow" aria-hidden />
                  )}
                </button>
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}

/** Screen colour sampler, where the browser offers one. */
function EyeDropperButton({ onPick }: { onPick: (hex: string) => void }) {
  const supported =
    typeof window !== "undefined" && "EyeDropper" in window
  if (!supported) return null
  return (
    <button
      type="button"
      aria-label="Pick a colour from the screen"
      onClick={() => {
        const Picker = (
          window as unknown as {
            EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> }
          }
        ).EyeDropper
        void new Picker().open().then((r) => onPick(r.sRGBHex))
      }}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground",
        "hover:bg-accent hover:text-foreground",
        FIELD.transition,
        FIELD.press,
      )}
    >
      <Pipette className="size-3.5" aria-hidden />
    </button>
  )
}
