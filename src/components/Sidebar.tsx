import { useRef, useState } from "react"
import { FileDown, FileUp, RotateCcw, X } from "lucide-react"
import { StampLogo } from "@/components/StampLogo"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import type {
  ArtFit,
  EdgeStyle,
  FrameStyle,
  PeelDirection,
  PostmarkStyle,
  PrintMethod,
  StampFormat,
  StampSettings,
} from "@/lib/settings"

// one-tap press presets; each patches the process plus its ink behaviour
const printPresets: {
  id: PrintMethod
  label: string
  patch: Partial<StampSettings>
}[] = [
  {
    id: "engraved",
    label: "Engraved",
    patch: { print: "engraved", relief: 0.45, ink: 1 },
  },
  {
    id: "offset",
    label: "Offset",
    patch: { print: "offset", relief: 0.12, ink: 1 },
  },
  {
    id: "photogravure",
    label: "Gravure",
    patch: { print: "photogravure", relief: 0.22, ink: 1 },
  },
  {
    id: "typeset",
    label: "Typeset",
    patch: { print: "typeset", relief: 0.6, ink: 1.15 },
  },
]

interface Props {
  settings: StampSettings
  imageName: string | null
  onChange: (patch: Partial<StampSettings>) => void
  onUpload: (file: File) => void
  onRemove: () => void
  onExportSettings: () => void
  onImportSettings: (file: File) => void
  onReset: () => void
}

function SliderRow({
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
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {format ? format(value) : value.toFixed(2)}
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

function TextRow({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs"
      />
    </div>
  )
}

const pct = (v: number) => `${Math.round(v * 100)}%`

// 3×3 spatial pad, row-major; null is the inert center
const directionPad: ({ value: PeelDirection; arrow: string } | null)[] = [
  { value: "top-left", arrow: "↖" },
  { value: "top", arrow: "↑" },
  { value: "top-right", arrow: "↗" },
  { value: "left", arrow: "←" },
  null,
  { value: "right", arrow: "→" },
  { value: "bottom-left", arrow: "↙" },
  { value: "bottom", arrow: "↓" },
  { value: "bottom-right", arrow: "↘" },
]

function Dropzone({
  imageName,
  onUpload,
  onOpen,
}: {
  imageName: string | null
  onUpload: (file: File) => void
  onOpen: () => void
}) {
  const [over, setOver] = useState(false)
  return (
    <button
      type="button"
      onClick={onOpen}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) onUpload(f)
      }}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 py-5 text-center transition-[color,background-color,border-color]",
        over
          ? "border-ring bg-accent text-foreground"
          : "border-input text-muted-foreground hover:border-ring/60 hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="size-5"
        aria-hidden="true"
      >
        <path d="M18.5 15C18.9142 15 19.25 15.3358 19.25 15.75V17.75H21.25C21.6642 17.75 22 18.0858 22 18.5C22 18.9142 21.6642 19.25 21.25 19.25H19.25V21.25C19.25 21.6642 18.9142 22 18.5 22C18.0858 22 17.75 21.6642 17.75 21.25V19.25H15.75C15.3358 19.25 15 18.9142 15 18.5C15 18.0858 15.3358 17.75 15.75 17.75H17.75V15.75C17.75 15.3358 18.0858 15 18.5 15Z" />
        <path fillRule="evenodd" clipRule="evenodd" d="M18.25 3C19.7688 3 21 4.23122 21 5.75V14.1699C20.2645 13.7443 19.4109 13.5 18.5 13.5C16.0512 13.5 14.0149 15.2607 13.585 17.585L9.2373 13.2373C8.55392 12.5541 7.44608 12.5541 6.7627 13.2373L4.5 15.5V18.25C4.5 18.9404 5.05964 19.5 5.75 19.5H13.6006C13.7095 20.0364 13.9052 20.5409 14.1709 21H5.75C4.23122 21 3 19.7688 3 18.25V5.75C3 4.23122 4.23122 3 5.75 3H18.25ZM15 6.5C13.6193 6.5 12.5 7.61929 12.5 9C12.5 10.3807 13.6193 11.5 15 11.5C16.3807 11.5 17.5 10.3807 17.5 9C17.5 7.61929 16.3807 6.5 15 6.5Z" />
      </svg>
      <span className="text-xs font-medium text-foreground">
        {imageName ? "Replace artwork" : "Upload artwork"}
      </span>
      <span className="text-[11px]">Drop or click · SVG, PNG, JPG, WebP</span>
    </button>
  )
}

export function Sidebar({
  settings,
  imageName,
  onChange,
  onUpload,
  onRemove,
  onExportSettings,
  onImportSettings,
  onReset,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const settingsFileRef = useRef<HTMLInputElement>(null)

  return (
    <aside className="flex min-h-0 w-full flex-1 flex-col border-t bg-sidebar md:h-full md:w-80 md:flex-none md:shrink-0 md:border-t-0 md:border-r">
      <div className="px-4 py-3">
        <StampLogo follow={!imageName} />
      </div>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 px-4 py-4">
          {/* Press */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Press
            </h2>
            <div
              role="radiogroup"
              aria-label="Printing process"
              className="grid grid-cols-4 gap-0.5 rounded-lg border bg-muted/50 p-0.5"
            >
              {printPresets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={settings.print === p.id}
                  onClick={() => onChange(p.patch)}
                  className={cn(
                    "rounded-md px-0.5 py-1.5 text-[11px] font-medium transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97]",
                    settings.print === p.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs">Ink colour</Label>
              <input
                type="color"
                aria-label="Ink colour"
                value={settings.inkColor}
                onChange={(e) => onChange({ inkColor: e.target.value })}
                className="h-7 w-14 cursor-pointer rounded-md border bg-transparent p-0.5"
              />
            </div>
            <SliderRow
              label="Ink weight"
              value={settings.ink}
              min={0}
              max={2}
              step={0.01}
              format={pct}
              onChange={(v) => onChange({ ink: v })}
            />
            <SliderRow
              label="Plate relief"
              value={settings.relief}
              min={0}
              max={1}
              step={0.01}
              format={pct}
              onChange={(v) => onChange({ relief: v })}
            />
          </section>

          <Separator />

          {/* Artwork */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Artwork
            </h2>
            <input
              ref={fileRef}
              type="file"
              accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onUpload(f)
                e.target.value = ""
              }}
            />
            <Dropzone
              imageName={imageName}
              onUpload={onUpload}
              onOpen={() => fileRef.current?.click()}
            />
            {imageName && (
              <div className="flex items-center gap-1.5 rounded-lg bg-accent/60 py-0.5 pl-2.5 pr-0.5">
                <span
                  className="min-w-0 flex-1 truncate text-xs text-foreground"
                  title={imageName}
                >
                  {imageName}
                </span>
                <button
                  type="button"
                  aria-label="Remove artwork"
                  onClick={onRemove}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color] hover:bg-accent hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
            )}
            {imageName && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Fit</Label>
                  <Select
                    value={settings.artFit}
                    onValueChange={(v) => onChange({ artFit: v as ArtFit })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contain">Fit inside</SelectItem>
                      <SelectItem value="cover">Fill and crop</SelectItem>
                      <SelectItem value="stretch">Stretch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs">
                    Full bleed
                    <span className="block text-[11px] font-normal text-muted-foreground">
                      Frame prints over the picture
                    </span>
                  </Label>
                  <Switch
                    checked={settings.artBleed}
                    onCheckedChange={(v) => onChange({ artBleed: v })}
                    aria-label="Run the artwork to the paper edge"
                  />
                </div>
                <SliderRow
                  label="Zoom"
                  value={settings.artZoom}
                  min={0.25}
                  max={3}
                  step={0.01}
                  format={(v) => `${v.toFixed(2)}\u00d7`}
                  onChange={(v) => onChange({ artZoom: v })}
                />
                <SliderRow
                  label="Position X"
                  value={settings.artPos.x}
                  min={-1}
                  max={1}
                  step={0.01}
                  format={(v) => v.toFixed(2)}
                  onChange={(v) =>
                    onChange({ artPos: { ...settings.artPos, x: v } })
                  }
                />
                <SliderRow
                  label="Position Y"
                  value={settings.artPos.y}
                  min={-1}
                  max={1}
                  step={0.01}
                  format={(v) => v.toFixed(2)}
                  onChange={(v) =>
                    onChange({ artPos: { ...settings.artPos, y: v } })
                  }
                />
              </>
            )}
          </section>

          <Separator />

          {/* Design */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Design
              </h2>
              <Switch
                checked={settings.designOn}
                onCheckedChange={(v) => onChange({ designOn: v })}
                aria-label="Print the frame and lettering"
              />
            </div>
            {settings.designOn && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Frame</Label>
                  <Select
                    value={settings.frame}
                    onValueChange={(v) => onChange({ frame: v as FrameStyle })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="rule">Single rule</SelectItem>
                      <SelectItem value="classic">Classic corners</SelectItem>
                      <SelectItem value="ornate">Ornate pearls</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <TextRow
                  label="Country line"
                  value={settings.country}
                  placeholder="UNITED STATES POSTAGE"
                  onChange={(v) => onChange({ country: v })}
                />
                <TextRow
                  label="Denomination"
                  value={settings.denomination}
                  placeholder="13¢"
                  onChange={(v) => onChange({ denomination: v })}
                />
                <TextRow
                  label="Caption"
                  value={settings.caption}
                  placeholder="optional"
                  onChange={(v) => onChange({ caption: v })}
                />
                <SliderRow
                  label="Margin"
                  value={settings.margin}
                  min={0.02}
                  max={0.2}
                  step={0.005}
                  format={(v) => v.toFixed(3)}
                  onChange={(v) => onChange({ margin: v })}
                />
              </>
            )}
          </section>

          <Separator />

          {/* Perforation */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Perforation
            </h2>
            <div className="space-y-2">
              <Label className="text-xs">Edge</Label>
              <Select
                value={settings.edge}
                onValueChange={(v) => onChange({ edge: v as EdgeStyle })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="perforated">Perforated</SelectItem>
                  <SelectItem value="wavy">Wavy die-cut</SelectItem>
                  <SelectItem value="rouletted">Rouletted</SelectItem>
                  <SelectItem value="imperforate">Imperforate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SliderRow
              label="Gauge"
              value={settings.gauge}
              min={7}
              max={16}
              step={0.5}
              format={(v) => `perf ${v.toFixed(1)}`}
              onChange={(v) => onChange({ gauge: v })}
            />
            <SliderRow
              label="Hole size"
              value={settings.holeSize}
              min={0.18}
              max={0.55}
              step={0.01}
              format={(v) => v.toFixed(2)}
              onChange={(v) => onChange({ holeSize: v })}
            />
            <SliderRow
              label="Torn fibre"
              value={settings.tear}
              min={0}
              max={1}
              step={0.01}
              format={pct}
              onChange={(v) => onChange({ tear: v })}
            />
          </section>

          <Separator />

          {/* Paper */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Paper
            </h2>
            <div className="space-y-2">
              <Label className="text-xs">Format</Label>
              <Select
                value={settings.format}
                onValueChange={(v) => onChange({ format: v as StampFormat })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="tall">Tall commemorative</SelectItem>
                  <SelectItem value="wide">Wide commemorative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SliderRow
              label="Stamp size"
              value={settings.size}
              min={0.3}
              max={1}
              step={0.01}
              format={pct}
              onChange={(v) => onChange({ size: v })}
            />
            <SliderRow
              label="Toning"
              value={settings.toning}
              min={0}
              max={1}
              step={0.01}
              format={pct}
              onChange={(v) => onChange({ toning: v })}
            />
            <SliderRow
              label="Fibre"
              value={settings.fiber}
              min={0}
              max={1}
              step={0.01}
              format={pct}
              onChange={(v) => onChange({ fiber: v })}
            />
            <SliderRow
              label="Foxing"
              value={settings.foxing}
              min={0}
              max={1}
              step={0.01}
              format={pct}
              onChange={(v) => onChange({ foxing: v })}
            />
            <SliderRow
              label="Handling wear"
              value={settings.wear}
              min={0}
              max={1}
              step={0.01}
              format={pct}
              onChange={(v) => onChange({ wear: v })}
            />
            <SliderRow
              label="Watermark"
              value={settings.watermark}
              min={0}
              max={1}
              step={0.01}
              format={pct}
              onChange={(v) => onChange({ watermark: v })}
            />
          </section>

          <Separator />

          {/* Cancellation */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Cancellation
              </h2>
              <Switch
                checked={settings.postmarkOn}
                onCheckedChange={(v) => onChange({ postmarkOn: v })}
                aria-label="Strike a postmark over the stamp"
              />
            </div>
            {settings.postmarkOn && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Style</Label>
                  <Select
                    value={settings.postmarkStyle}
                    onValueChange={(v) =>
                      onChange({ postmarkStyle: v as PostmarkStyle })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Datestamp + bars</SelectItem>
                      <SelectItem value="bars">Killer bars</SelectItem>
                      <SelectItem value="datestamp">Datestamp only</SelectItem>
                      <SelectItem value="grid">Grid cancel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* only the dial carries lettering; bars and grids do not */}
                {(settings.postmarkStyle === "datestamp" ||
                  settings.postmarkStyle === "both") && (
                  <>
                    <TextRow
                      label="Town"
                      value={settings.postmarkCity}
                      placeholder="NEW YORK NY"
                      onChange={(v) => onChange({ postmarkCity: v })}
                    />
                    <TextRow
                      label="Date"
                      value={settings.postmarkDate}
                      placeholder="12 JUN 1978"
                      onChange={(v) => onChange({ postmarkDate: v })}
                    />
                  </>
                )}
                <SliderRow
                  label="Strike angle"
                  value={settings.postmarkAngle}
                  min={0}
                  max={1}
                  step={0.01}
                  format={(v) => `${Math.round((v - 0.5) * 180)}°`}
                  onChange={(v) => onChange({ postmarkAngle: v })}
                />
                <SliderRow
                  label="Strike X"
                  value={settings.postmarkPos.x}
                  min={0}
                  max={1}
                  step={0.01}
                  format={pct}
                  onChange={(v) =>
                    onChange({ postmarkPos: { ...settings.postmarkPos, x: v } })
                  }
                />
                <SliderRow
                  label="Strike Y"
                  value={settings.postmarkPos.y}
                  min={0}
                  max={1}
                  step={0.01}
                  format={pct}
                  onChange={(v) =>
                    onChange({ postmarkPos: { ...settings.postmarkPos, y: v } })
                  }
                />
                <SliderRow
                  label="Ink strength"
                  value={settings.postmarkStrength}
                  min={0}
                  max={1}
                  step={0.01}
                  format={pct}
                  onChange={(v) => onChange({ postmarkStrength: v })}
                />
              </>
            )}
          </section>

          <Separator />

          {/* Lift */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Lift
            </h2>
            <div className="space-y-2">
              <Label className="text-xs">Corner</Label>
              <div
                role="radiogroup"
                aria-label="Lifted corner"
                className="mx-auto grid w-fit grid-cols-3 gap-1"
              >
                {directionPad.map((d, i) =>
                  d ? (
                    <button
                      key={d.value}
                      type="button"
                      role="radio"
                      aria-checked={settings.peelDirection === d.value}
                      aria-label={d.value.replace("-", " ")}
                      onClick={() => onChange({ peelDirection: d.value })}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg border text-sm transition-[color,background-color,border-color]",
                        settings.peelDirection === d.value
                          ? "border-transparent bg-primary text-primary-foreground"
                          : "border-input text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      {d.arrow}
                    </button>
                  ) : (
                    <span
                      key={`c${i}`}
                      className="flex size-9 items-center justify-center text-muted-foreground/40"
                      aria-hidden
                    >
                      ·
                    </span>
                  ),
                )}
              </div>
            </div>
            <SliderRow
              label="Lift amount"
              value={settings.peelAmount}
              min={0}
              max={0.9}
              step={0.01}
              format={pct}
              onChange={(v) => onChange({ peelAmount: v })}
            />
            <SliderRow
              label="Curl radius"
              value={settings.curl}
              min={0.02}
              max={0.25}
              step={0.005}
              onChange={(v) => onChange({ curl: v })}
            />
            <SliderRow
              label="Shadow"
              value={settings.shadow}
              min={0}
              max={1}
              step={0.01}
              format={pct}
              onChange={(v) => onChange({ shadow: v })}
            />
          </section>

          <Separator />

          {/* Scene */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Scene
            </h2>
            <SliderRow
              label="Light X"
              value={settings.light.x}
              min={0}
              max={1}
              step={0.01}
              format={pct}
              onChange={(v) => onChange({ light: { ...settings.light, x: v } })}
            />
            <SliderRow
              label="Light Y"
              value={settings.light.y}
              min={0}
              max={1}
              step={0.01}
              format={pct}
              onChange={(v) => onChange({ light: { ...settings.light, y: v } })}
            />
            <div className="space-y-2">
              <Label className="text-xs">Background</Label>
              <Select
                value={settings.background}
                onValueChange={(v) =>
                  onChange({ background: v as StampSettings["background"] })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transparent">Transparent</SelectItem>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <Separator />

          {/* Settings */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Settings
            </h2>
            <input
              ref={settingsFileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onImportSettings(f)
                e.target.value = ""
              }}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onExportSettings}
                title="Download the current sliders as a JSON file"
              >
                <FileDown aria-hidden />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => settingsFileRef.current?.click()}
                title="Load a saved settings JSON file"
              >
                <FileUp aria-hidden />
                Import
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-muted-foreground"
                onClick={onReset}
              >
                <RotateCcw aria-hidden />
                Reset
              </Button>
            </div>
          </section>
        </div>
      </ScrollArea>
    </aside>
  )
}
