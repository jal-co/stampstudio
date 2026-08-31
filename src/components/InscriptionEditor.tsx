import { useState } from "react"
import { ChevronRight, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ColorPickerField } from "@/components/ColorPickerField"
import { cn } from "@/lib/utils"
import type { Anchor, Inscription, Typeface } from "@/lib/settings"

const FACES: [Typeface, string][] = [
  ["serif", "Engraved serif"],
  ["didone", "Didone"],
  ["grotesque", "Roman caps"],
  ["condensed", "Condensed gothic"],
  ["typewriter", "Typewriter"],
  ["script", "Script"],
]

const ANCHORS: [Anchor, string][] = [
  ["top-left", "Top left"],
  ["top-center", "Top centre"],
  ["top-right", "Top right"],
  ["center", "Centre"],
  ["bottom-left", "Foot left"],
  ["bottom-center", "Foot centre"],
  ["bottom-right", "Foot right"],
]

function newInscription(color: string): Inscription {
  return {
    id: Math.random().toString(36).slice(2, 9),
    text: "Inscription",
    typeface: "serif",
    color,
    size: 0.035,
    anchor: "bottom-center",
    pos: { x: 0, y: 0 },
    rotate: 0,
    arc: false,
    caps: true,
    tracking: 0.12,
  }
}

interface Props {
  items: Inscription[]
  swatches: string[]
  defaultColor: string
  onChange: (items: Inscription[]) => void
}

/** Free lines of type: add as many as the design needs, place each one. */
export function InscriptionEditor({
  items,
  swatches,
  defaultColor,
  onChange,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

  const patch = (id: string, p: Partial<Inscription>) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...p } : i)))

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const open = openId === item.id
        return (
          <div key={item.id} className="rounded-lg border border-input">
            <div className="flex items-center gap-1 p-1">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : item.id)}
                aria-expanded={open}
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color] hover:bg-accent hover:text-foreground"
              >
                <ChevronRight
                  className={cn(
                    "size-3.5 transition-transform duration-150",
                    open && "rotate-90",
                  )}
                  aria-hidden
                />
              </button>
              <Input
                value={item.text}
                onChange={(e) => patch(item.id, { text: e.target.value })}
                className="h-7 flex-1 border-0 px-1 text-xs shadow-none focus-visible:ring-0"
                placeholder="Inscription"
              />
              <button
                type="button"
                aria-label="Remove inscription"
                onClick={() => onChange(items.filter((i) => i.id !== item.id))}
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color] hover:bg-accent hover:text-foreground"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>

            {open && (
              <div className="space-y-3 border-t p-2.5">
                <div className="space-y-2">
                  <Label className="text-xs">Face</Label>
                  <Select
                    value={item.typeface}
                    onValueChange={(v) =>
                      patch(item.id, { typeface: v as Typeface })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FACES.map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Anchor</Label>
                  <Select
                    value={item.anchor}
                    onValueChange={(v) =>
                      patch(item.id, { anchor: v as Anchor })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANCHORS.map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ColorPickerField
                  label="Colour"
                  value={item.color}
                  swatches={swatches}
                  onChange={(hex) => patch(item.id, { color: hex })}
                />
                <Row
                  label="Size"
                  value={item.size}
                  min={0.012}
                  max={0.14}
                  step={0.002}
                  onChange={(v) => patch(item.id, { size: v })}
                />
                <Row
                  label="X"
                  value={item.pos.x}
                  min={-0.5}
                  max={0.5}
                  step={0.005}
                  onChange={(v) =>
                    patch(item.id, { pos: { ...item.pos, x: v } })
                  }
                />
                <Row
                  label="Y"
                  value={item.pos.y}
                  min={-0.5}
                  max={0.5}
                  step={0.005}
                  onChange={(v) =>
                    patch(item.id, { pos: { ...item.pos, y: v } })
                  }
                />
                <Row
                  label="Rotate"
                  value={item.rotate}
                  min={-0.25}
                  max={0.25}
                  step={0.005}
                  format={(v) => `${Math.round(v * 360)}°`}
                  onChange={(v) => patch(item.id, { rotate: v })}
                />
                <Row
                  label="Tracking"
                  value={item.tracking}
                  min={0}
                  max={0.6}
                  step={0.01}
                  onChange={(v) => patch(item.id, { tracking: v })}
                />
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs">Capitals</Label>
                  <Switch
                    checked={item.caps}
                    onCheckedChange={(v) => patch(item.id, { caps: v })}
                    aria-label="Set in capitals"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs">
                    Curve around the window
                    <span className="block text-[11px] font-normal text-muted-foreground">
                      Anchor decides over or under
                    </span>
                  </Label>
                  <Switch
                    checked={item.arc}
                    onCheckedChange={(v) => patch(item.id, { arc: v })}
                    aria-label="Curve around the window"
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => {
          const item = newInscription(defaultColor)
          onChange([...items, item])
          setOpenId(item.id)
        }}
      >
        <Plus aria-hidden />
        Add inscription
      </Button>
    </div>
  )
}

function Row({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format?: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {format ? format(value) : value.toFixed(3)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  )
}
