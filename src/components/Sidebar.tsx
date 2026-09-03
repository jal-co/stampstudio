import { useRef, useState } from "react"
import { FileDown, FileUp, RotateCcw, X } from "lucide-react"
import { StampLogo } from "@/components/StampLogo"
import { ColorPickerField } from "@/components/ColorPickerField"
import { templates, type Template } from "@/lib/templates"
import { Variations } from "@/components/Variations"
import { InscriptionEditor } from "@/components/InscriptionEditor"
import { TemplatePreview } from "@/components/TemplatePreview"
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
  DenomAnchor,
  GroundStyle,
  Inscription,
  EdgeStyle,
  FrameStyle,
  PeelDirection,
  PostmarkStyle,
  PrintMethod,
  OrnamentStyle,
  StampFormat,
  StampSettings,
  Typeface,
  VignetteShape,
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
  image: ImageBitmap | null
  imageName: string | null
  onChange: (patch: Partial<StampSettings>) => void
  onTemplate: (template: Template) => void
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

// inks a postal printer would actually have on the shelf
const inkSwatches = [
  "#1d3f6e",
  "#8a1c2b",
  "#1f5c3a",
  "#5a3a86",
  "#a8571c",
  "#2b2b2b",
]

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

/** A titled block of controls, with an optional switch in the header. */
function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  /** [value, label] pairs, in the order they should read */
  options: [string, string][]
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs">
        {label}
        {hint && (
          <span className="block text-[11px] font-normal text-muted-foreground">
            {hint}
          </span>
        )}
      </Label>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  )
}

export function Sidebar({
  settings,
  image,
  imageName,
  onChange,
  onTemplate,
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
          {/* Four treatments of the loaded artwork. First, because once there
              is a picture this is the question, and the sidebar scrolls for
              four thousand pixels below here. */}
          {image && (
            <>
              <Section title="Try it as">
                <Variations
                  settings={settings}
                  image={image}
                  imageName={imageName}
                  onChange={onChange}
                />
              </Section>
              <Separator />
            </>
          )}

          {/* Finished stamps: a photograph and the plates that suit it */}
          <Section title="Templates">
            <div className="grid grid-cols-2 gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTemplate(t)}
                  title={`${t.credit.title} by ${t.credit.creator} (${t.credit.license})`}
                  className={cn(
                    "group overflow-hidden rounded-lg border border-input text-left",
                    "transition-[border-color,transform] duration-150 ease-out",
                    "hover:border-ring/60 active:scale-[0.98]",
                  )}
                >
                  <TemplatePreview template={t} />
                  <span className="block truncate px-2 py-1.5 text-[11px] font-medium">
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Photographs are Creative Commons, found through Openverse. Each
              one keeps its credit on the canvas.
            </p>
          </Section>

          <Separator />

          {/* Artwork and how it sits in its window */}
          <Section title="Artwork">
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
                <SelectRow
                  label="Fit"
                  value={settings.artFit}
                  onChange={(v) => onChange({ artFit: v as ArtFit })}
                  options={[
                    ["contain", "Fit inside"],
                    ["cover", "Fill and crop"],
                    ["stretch", "Stretch"],
                  ]}
                />
                {settings.vignette === "none" ? (
                  <SwitchRow
                    label="Full bleed"
                    hint="Frame prints over the picture"
                    checked={settings.artBleed}
                    onChange={(v) => onChange({ artBleed: v })}
                  />
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    The picture is held to the {settings.vignette} vignette, so
                    it cannot bleed to the paper edge.
                  </p>
                )}
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
          </Section>

          <Separator />

          {/* The press, and the ink it lays down */}
          <Section title="Printing">
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
            <ColorPickerField
              label="Ink colour"
              value={settings.inkColor}
              swatches={inkSwatches}
              onChange={(hex) => onChange({ inkColor: hex })}
            />
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
          </Section>

          <Separator />

          {/* Border plate */}
          <Section
            title="Frame"
            action={
              <Switch
                checked={settings.designOn}
                onCheckedChange={(v) => onChange({ designOn: v })}
                aria-label="Print the frame and lettering"
              />
            }
          >
            {settings.designOn && (
              <>
                <SelectRow
                  label="Style"
                  value={settings.frame}
                  onChange={(v) => onChange({ frame: v as FrameStyle })}
                  options={[
                    ["none", "None"],
                    ["rule", "Single rule"],
                    ["classic", "Classic corners"],
                    ["ornate", "Ornate pearls"],
                    ["arched", "Arched vignette"],
                  ]}
                />
                <ColorPickerField
                  label="Frame & lettering colour"
                  value={settings.frameColor}
                  swatches={inkSwatches}
                  onChange={(hex) => onChange({ frameColor: hex })}
                />
                <SelectRow
                  label="Corner ornament"
                  value={settings.ornament}
                  onChange={(v) => onChange({ ornament: v as OrnamentStyle })}
                  options={[
                    ["none", "None"],
                    ["scroll", "Engraver's scroll"],
                    ["leaf", "Fleuron"],
                    ["rosette", "Rosette"],
                    ["deco", "Deco steps"],
                  ]}
                />
                {settings.ornament !== "none" && (
                  <SliderRow
                    label="Ornament size"
                    value={settings.ornamentSize}
                    min={0.04}
                    max={0.22}
                    step={0.005}
                    format={(v) => v.toFixed(3)}
                    onChange={(v) => onChange({ ornamentSize: v })}
                  />
                )}
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
          </Section>

          <Separator />

          {/* The window the picture is masked into */}
          <Section title="Vignette">
            <SelectRow
              label="Shape"
              value={settings.vignette}
              onChange={(v) => onChange({ vignette: v as VignetteShape })}
              options={[
                ["none", "None"],
                ["rect", "Rectangle"],
                ["arch", "Arch"],
                ["oval", "Oval"],
                ["circle", "Circle"],
              ]}
            />
            {settings.vignette !== "none" && (
              <>
                <SwitchRow
                  label="Draw vignette"
                  checked={settings.vignetteRule}
                  onChange={(v) => onChange({ vignetteRule: v })}
                />
                {settings.vignetteRule && (
                  <ColorPickerField
                    label="Vignette colour"
                    value={settings.vignetteColor}
                    swatches={inkSwatches}
                    onChange={(hex) => onChange({ vignetteColor: hex })}
                  />
                )}
                <SliderRow
                  label="Feather"
                  value={settings.feather}
                  min={0}
                  max={1}
                  step={0.01}
                  format={pct}
                  onChange={(v) => onChange({ feather: v })}
                />
              </>
            )}
          </Section>

          <Separator />

          {/* Country line, value and caption */}
          {settings.designOn && (
            <>
              <Section title="Lettering">
                <SelectRow
                  label="Typeface"
                  value={settings.typeface}
                  onChange={(v) => onChange({ typeface: v as Typeface })}
                  options={[
                    ["serif", "Engraved serif"],
                    ["didone", "Didone"],
                    ["grotesque", "Roman caps"],
                    ["condensed", "Condensed gothic"],
                    ["typewriter", "Typewriter"],
                    ["script", "Script"],
                  ]}
                />
                <TextRow
                  label="Country line"
                  value={settings.country}
                  placeholder="UNITED STATES POSTAGE"
                  onChange={(v) => onChange({ country: v })}
                />
                {settings.country && (
                  <SwitchRow
                    label="Curve over the vignette"
                    checked={settings.countryArc}
                    onChange={(v) => onChange({ countryArc: v })}
                  />
                )}
                <TextRow
                  label="Denomination"
                  value={settings.denomination}
                  placeholder="13¢"
                  onChange={(v) => onChange({ denomination: v })}
                />
                {settings.denomination && (
                  <>
                    <SwitchRow
                      label="Corner value tablets"
                      checked={settings.tablets}
                      onChange={(v) => onChange({ tablets: v })}
                    />
                    {!settings.tablets && (
                      <SelectRow
                        label="Value corner"
                        value={settings.denomAnchor}
                        onChange={(v) =>
                          onChange({ denomAnchor: v as DenomAnchor })
                        }
                        options={[
                          ["bottom-left", "Lower left"],
                          ["bottom-center", "Lower centre"],
                          ["bottom-right", "Lower right"],
                          ["top-left", "Upper left"],
                          ["top-right", "Upper right"],
                        ]}
                      />
                    )}
                    <SliderRow
                      label="Value X"
                      value={settings.denomPos.x}
                      min={-0.5}
                      max={0.5}
                      step={0.005}
                      format={(v) => v.toFixed(3)}
                      onChange={(v) =>
                        onChange({ denomPos: { ...settings.denomPos, x: v } })
                      }
                    />
                    <SliderRow
                      label="Value Y"
                      value={settings.denomPos.y}
                      min={-0.5}
                      max={0.5}
                      step={0.005}
                      format={(v) => v.toFixed(3)}
                      onChange={(v) =>
                        onChange({ denomPos: { ...settings.denomPos, y: v } })
                      }
                    />
                  </>
                )}
                <TextRow
                  label="Caption"
                  value={settings.caption}
                  placeholder="optional"
                  onChange={(v) => onChange({ caption: v })}
                />
                {settings.caption && (
                  <SwitchRow
                    label="Caption on a ribbon"
                    checked={settings.ribbon}
                    onChange={(v) => onChange({ ribbon: v })}
                  />
                )}
              </Section>

              <Separator />
            </>
          )}

          <Separator />

          {/* Pattern in the field the picture leaves */}
          <Section title="Ground">
            <SelectRow
              label="Pattern"
              value={settings.ground}
              onChange={(v) => onChange({ ground: v as GroundStyle })}
              options={[
                ["none", "None"],
                ["guilloche", "Engine-turned guilloche"],
                ["burelage", "Burelage lines"],
                ["crosshatch", "Cross-hatch"],
                ["panel", "Graded panel"],
                ["stipple", "Stipple"],
                ["halftone", "Halftone screen"],
              ]}
            />
            {settings.ground !== "none" && (
              <>
                <ColorPickerField
                  label="Ground colour"
                  value={settings.groundColor}
                  swatches={inkSwatches}
                  onChange={(hex) => onChange({ groundColor: hex })}
                />
                <SliderRow
                  label="Weight"
                  value={settings.groundWeight}
                  min={0}
                  max={1}
                  step={0.01}
                  format={pct}
                  onChange={(v) => onChange({ groundWeight: v })}
                />
                <SliderRow
                  label="Pitch"
                  value={settings.groundScale}
                  min={0}
                  max={1}
                  step={0.01}
                  format={pct}
                  onChange={(v) => onChange({ groundScale: v })}
                />
                <SliderRow
                  label="Angle"
                  value={settings.groundAngle}
                  min={0}
                  max={1}
                  step={0.005}
                  format={(v) => `${Math.round(v * 360)}°`}
                  onChange={(v) => onChange({ groundAngle: v })}
                />
                <SliderRow
                  label="Ink strength"
                  value={settings.groundStrength}
                  min={0}
                  max={1}
                  step={0.01}
                  format={pct}
                  onChange={(v) => onChange({ groundStrength: v })}
                />
                <SliderRow
                  label="Clear behind type"
                  value={settings.groundClear}
                  min={0}
                  max={1}
                  step={0.01}
                  format={pct}
                  onChange={(v) => onChange({ groundClear: v })}
                />
                <SwitchRow
                  label="Run under the picture"
                  hint="Otherwise the ground stops at the window"
                  checked={settings.groundUnderArt}
                  onChange={(v) => onChange({ groundUnderArt: v })}
                />
              </>
            )}
          </Section>

          <Separator />

          {/* Free type, placed by hand */}
          <Section title="Inscriptions">
            <InscriptionEditor
              items={settings.inscriptions}
              swatches={inkSwatches}
              defaultColor={settings.frameColor}
              onChange={(inscriptions: Inscription[]) =>
                onChange({ inscriptions })
              }
            />
          </Section>

          {/* Stock */}
          <Section title="Paper">
            <SelectRow
              label="Format"
              value={settings.format}
              onChange={(v) => onChange({ format: v as StampFormat })}
              options={[
                ["portrait", "Portrait"],
                ["landscape", "Landscape"],
                ["square", "Square"],
                ["tall", "Tall commemorative"],
                ["wide", "Wide commemorative"],
              ]}
            />
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
          </Section>

          <Separator />

          {/* How the sheet was separated */}
          <Section title="Perforation">
            <SelectRow
              label="Edge"
              value={settings.edge}
              onChange={(v) => onChange({ edge: v as EdgeStyle })}
              options={[
                ["perforated", "Perforated"],
                ["wavy", "Wavy die-cut"],
                ["rouletted", "Rouletted"],
                ["imperforate", "Imperforate"],
              ]}
            />
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
          </Section>

          <Separator />

          {/* The strike */}
          <Section
            title="Cancellation"
            action={
              <Switch
                checked={settings.postmarkOn}
                onCheckedChange={(v) => onChange({ postmarkOn: v })}
                aria-label="Strike a postmark over the stamp"
              />
            }
          >
            {settings.postmarkOn && (
              <>
                <SelectRow
                  label="Style"
                  value={settings.postmarkStyle}
                  onChange={(v) =>
                    onChange({ postmarkStyle: v as PostmarkStyle })
                  }
                  options={[
                    ["both", "Datestamp + bars"],
                    ["bars", "Killer bars"],
                    ["datestamp", "Datestamp only"],
                    ["grid", "Grid cancel"],
                  ]}
                />
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
          </Section>

          <Separator />

          {/* Lifting a corner off the envelope */}
          <Section title="Lift">
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
          </Section>

          <Separator />

          {/* Studio */}
          <Section title="Light & background">
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
            <SelectRow
              label="Background"
              value={settings.background}
              onChange={(v) =>
                onChange({ background: v as StampSettings["background"] })
              }
              options={[
                ["transparent", "Transparent"],
                ["white", "White"],
                ["black", "Black"],
              ]}
            />
          </Section>

          <Separator />

          <Section title="Settings">
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
          </Section>
        </div>
      </ScrollArea>
    </aside>
  )
}
