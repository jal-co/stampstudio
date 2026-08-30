import * as THREE from "three"
import type { StampSettings } from "./settings"
import { peelAngles } from "./settings"
import { buildStampMaps } from "./stamp-texture"

const SEGS = 160

/** Procedural studio environment as an equirect texture (softboxes + sky). */
function studioEnvTexture(): THREE.Texture {
  const w = 1024
  const h = 512
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, "#f6f6f4")
  g.addColorStop(0.45, "#d2d2ce")
  g.addColorStop(0.55, "#b6b6b2")
  g.addColorStop(1, "#84847f")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const blob = (x: number, y: number, rx: number, ry: number, a: number) => {
    const r = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry))
    r.addColorStop(0, `rgba(255,255,255,${a})`)
    r.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = r
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(1, ry / rx)
    ctx.translate(-x, -y)
    ctx.beginPath()
    ctx.arc(x, y, rx, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  blob(w * 0.25, h * 0.22, 210, 120, 0.95)
  blob(w * 0.72, h * 0.3, 140, 90, 0.7)
  blob(w * 0.5, h * 0.78, 240, 70, 0.2)
  const tex = new THREE.CanvasTexture(canvas)
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.wrapS = THREE.RepeatWrapping
  tex.colorSpace = THREE.NoColorSpace
  return tex
}

const VERT = /* glsl */ `
out vec2 vUv;
out vec3 vNormal;
out vec3 vWorldPos;
out float vAO;
uniform float uCurlH;
void main() {
  vUv = uv;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vAO = clamp(position.z / max(uCurlH, 1e-4), 0.0, 1.0);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`

/*
 * Paper, not foil. The face is a rough dielectric: broad diffuse, a weak
 * wide sheen, fibre that breaks up the normal at grazing angles, and ink
 * that stands proud of the sheet the way an intaglio plate leaves it.
 * The back is gummed: creamier, glossier, and the print shows through.
 */
const FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
in vec3 vNormal;
in vec3 vWorldPos;
in float vAO;
out vec4 outColor;

uniform sampler2D uMap;  // albedo, alpha = perforated silhouette
uniform sampler2D uAux;  // r = ink coverage, g = distance from the cut edge
uniform sampler2D uEnv;
uniform vec3 uCamPos;
uniform float uMaxMip;
uniform float uAspect;
uniform float uRough;
uniform float uSheen;
uniform float uRelief;
uniform float uReliefLod;
uniform float uInkGloss;
uniform float uFiber;
uniform float uWatermark;
uniform float uToning;
uniform float uShowThrough;
uniform float uPeelOn;
uniform vec2 uLight;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1, 0));
  float c = hash(i + vec2(0, 1)), d = hash(i + vec2(1, 1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float a = 0.5;
  float r = 0.0;
  for (int i = 0; i < 4; i++) {
    r += a * vnoise(p);
    p = p * 2.07 + vec2(13.1, 7.3);
    a *= 0.5;
  }
  return r;
}

vec3 srgb2lin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 lin2srgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }

vec2 equirectUv(vec3 d) {
  d = normalize(d);
  float phi = atan(d.z, d.x);
  float theta = acos(clamp(d.y, -1.0, 1.0));
  return vec2((phi + 3.14159265) / 6.2831853, theta / 3.14159265);
}
vec3 envSample(vec3 R, float rough) {
  return srgb2lin(textureLod(uEnv, equirectUv(R), rough * uMaxMip).rgb);
}

/** Cotangent-frame normal perturbation (Schüler), driven by a height gradient. */
vec3 perturbNormal(vec3 N, vec3 P, vec2 uv, vec2 dGrad) {
  vec3 dp1 = dFdx(P);
  vec3 dp2 = dFdy(P);
  vec2 duv1 = dFdx(uv);
  vec2 duv2 = dFdy(uv);
  vec3 dp2perp = cross(dp2, N);
  vec3 dp1perp = cross(N, dp1);
  vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
  vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;
  float invmax = inversesqrt(max(dot(T, T), dot(B, B)) + 1e-12);
  return normalize(N - (T * dGrad.x + B * dGrad.y) * invmax);
}

/** Paper surface height: laid fibre plus the impressed watermark lozenge. */
float paperHeight(vec2 q) {
  float fib = fbm(q * 260.0) * 0.6 + vnoise(q * 900.0) * 0.4;
  fib += sin(q.y * 620.0) * 0.05;
  vec2 w = fract(q * 9.0) * 2.0 - 1.0;
  float wm = smoothstep(1.02, 0.86, abs(w.x) + abs(w.y));
  return fib * uFiber + wm * uWatermark * 0.55;
}

void main() {
  vec4 base = texture(uMap, vUv);
  if (base.a < 0.03) discard;
  vec3 albedo = srgb2lin(base.rgb);
  vec2 aux = texture(uAux, vUv).rg;
  float ink = aux.r;
  float edge = aux.g;

  // fibre and watermark are evaluated in aspect-corrected uv so they never
  // stretch with the stamp format
  vec2 q = vec2(vUv.x * uAspect, vUv.y);
  float e = 0.0016;
  float hC = paperHeight(q);
  vec2 paperGrad = vec2(paperHeight(q + vec2(e, 0.0)) - hC,
                        paperHeight(q + vec2(0.0, e)) - hC);

  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCamPos - vWorldPos);

  if (!gl_FrontFacing) {
    // gummed back: creamy, glossier than the face, print showing through
    N = -N;
    N = perturbNormal(N, vWorldPos, vUv, paperGrad * 6.0);
    vec3 Rb = reflect(-V, N);
    float cosB = clamp(dot(N, V), 0.0, 1.0);
    vec3 gum = srgb2lin(mix(vec3(0.972, 0.957, 0.898),
                            vec3(0.898, 0.843, 0.706), uToning));
    gum *= 1.0 - ink * uShowThrough * 0.3;
    vec3 L = normalize(vec3((uLight.x - 0.5) * 2.2, (uLight.y - 0.5) * 2.2, 1.4));
    float dif = clamp(dot(N, L), 0.0, 1.0);
    float fresB = 0.03 + 0.35 * pow(1.0 - cosB, 5.0);
    vec3 col = gum * (0.5 + 0.7 * dif) + envSample(Rb, 0.32) * fresB;
    col *= mix(1.0, 0.62, (1.0 - vAO) * uPeelOn);
    outColor = vec4(lin2srgb(col), base.a);
    return;
  }

  // intaglio: the plate leaves the ink standing off the sheet
  float iC = textureLod(uAux, vUv, uReliefLod).r;
  float ix = textureLod(uAux, vUv + vec2(0.0018, 0.0), uReliefLod).r;
  float iy = textureLod(uAux, vUv + vec2(0.0, 0.0018), uReliefLod).r;
  vec2 grad = vec2(ix - iC, iy - iC) * (uRelief * 9.0) + paperGrad * 8.0;
  N = perturbNormal(N, vWorldPos, vUv, grad);

  // the torn edge exposes unprinted fibre, a shade brighter than the face
  albedo = mix(albedo, mix(albedo, vec3(0.9), 0.35),
               1.0 - smoothstep(0.0, 0.55, edge));

  vec3 R = reflect(-V, N);
  float cosT = clamp(dot(N, V), 0.0, 1.0);
  vec3 L = normalize(vec3((uLight.x - 0.5) * 2.2, (uLight.y - 0.5) * 2.2, 1.4));
  float dif = clamp(dot(N, L), 0.0, 1.0);

  // ink lies smoother than the sheet around it
  float rough = mix(uRough, uRough * 0.5, ink * uInkGloss);
  vec3 env = envSample(R, rough);
  float fres = 0.028 + 0.2 * pow(1.0 - cosT, 5.0);
  float specKey = pow(clamp(dot(R, L), 0.0, 1.0), mix(14.0, 60.0, ink * uInkGloss));

  vec3 diffuse = albedo * (0.46 + 0.72 * dif);
  vec3 spec = (env * fres * 1.5 + vec3(specKey * 0.16)) * uSheen
              * mix(0.55, 1.0, ink * uInkGloss + 0.35);

  vec3 color = diffuse + spec;
  // the sheet shades as it lifts away from the surface
  color *= mix(1.0, 0.9, (1.0 - vAO) * uPeelOn * step(0.02, vAO));

  outColor = vec4(lin2srgb(color), base.a);
}`

/** Surface response per printing process. */
const PRINT_PARAMS: Record<
  string,
  { relief: number; lod: number; gloss: number }
> = {
  engraved: { relief: 1, lod: 0.7, gloss: 0.55 },
  offset: { relief: 0.35, lod: 1.6, gloss: 0.75 },
  photogravure: { relief: 0.5, lod: 1.3, gloss: 0.4 },
  typeset: { relief: 0.8, lod: 0.9, gloss: 0.3 },
}

export type GifAnim = "sweep" | "peel"

/**
 * Lift pose over a loop: flat → corner lifted → away out of frame → back
 * in → settled flat again.
 */
export function gifPeelPose(t: number): { peel: number; fly: number } {
  const ease = (u: number) => 0.5 - 0.5 * Math.cos(u * Math.PI)
  const ramp = (a: number, b: number) =>
    ease(Math.min(1, Math.max(0, (t - a) / (b - a))))
  if (t < 0.5) {
    return { peel: ramp(0.04, 0.42), fly: ramp(0.3, 0.5) }
  }
  return { peel: 1 - ramp(0.6, 0.96), fly: 1 - ramp(0.5, 0.7) }
}

export class StampRenderer {
  canvas: HTMLCanvasElement
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private geometry: THREE.PlaneGeometry
  private material: THREE.ShaderMaterial
  private mesh: THREE.Mesh
  private shadowMat: THREE.Material & { opacity: number }
  private shadowMesh!: THREE.Mesh
  private source: ImageBitmap | null = null
  private geomKey = ""
  private mapsKey = ""
  private mapAspect = 1
  private tilt = new THREE.Vector2(0, 0)
  private tiltTarget = new THREE.Vector2(0, 0)

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.toneMapping = THREE.NoToneMapping

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(24, 1, 0.1, 20)
    this.camera.position.set(0, 0, 3.2)

    this.geometry = new THREE.PlaneGeometry(1, 1, SEGS, SEGS)

    this.material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        uMap: { value: null },
        uAux: { value: null },
        uEnv: { value: studioEnvTexture() },
        uCamPos: { value: this.camera.position },
        uMaxMip: { value: 8 },
        uAspect: { value: 1 },
        uRough: { value: 0.78 },
        uSheen: { value: 0.5 },
        uRelief: { value: 0.45 },
        uReliefLod: { value: 0.7 },
        uInkGloss: { value: 0.55 },
        uFiber: { value: 0.45 },
        uWatermark: { value: 0.15 },
        uToning: { value: 0.24 },
        uShowThrough: { value: 0.6 },
        uPeelOn: { value: 0 },
        uLight: { value: new THREE.Vector2(0.62, 0.72) },
        uCurlH: { value: 0.1 },
      },
    })

    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.scene.add(this.mesh)

    const sc = document.createElement("canvas")
    sc.width = sc.height = 256
    const sctx = sc.getContext("2d")!
    const grad = sctx.createRadialGradient(128, 128, 30, 128, 128, 128)
    grad.addColorStop(0, "rgba(0,0,0,0.85)")
    grad.addColorStop(0.7, "rgba(0,0,0,0.35)")
    grad.addColorStop(1, "rgba(0,0,0,0)")
    sctx.fillStyle = grad
    sctx.fillRect(0, 0, 256, 256)
    this.shadowMat = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(sc),
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    })
    this.shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      this.shadowMat,
    )
    this.shadowMesh.position.z = -0.05
    this.scene.add(this.shadowMesh)
  }

  setImage(source: ImageBitmap | null) {
    this.source = source
    this.mapsKey = ""
  }

  /** Pointer position in [-1, 1]; the stamp tilts toward it. */
  setTilt(x: number, y: number) {
    this.tiltTarget.set(x, y)
  }

  hasImage() {
    return this.source !== null
  }

  /** Re-bake the paper, the print and the perforations when they change. */
  private updateMaps(s: StampSettings) {
    const key = [
      s.format,
      s.edge,
      s.gauge,
      s.holeSize,
      s.tear,
      s.toning,
      s.foxing,
      s.wear,
      s.print,
      s.inkColor,
      s.ink,
      s.designOn,
      s.frame,
      s.country,
      s.denomination,
      s.caption,
      s.margin,
      s.postmarkOn,
      s.postmarkStyle,
      s.postmarkCity,
      s.postmarkDate,
      s.postmarkAngle,
      s.postmarkPos.x,
      s.postmarkPos.y,
      s.postmarkStrength,
      this.source ? `${this.source.width}x${this.source.height}` : "none",
    ].join("|")
    if (key === this.mapsKey) return
    this.mapsKey = key

    const maps = buildStampMaps(s, this.source)
    const color = new THREE.CanvasTexture(maps.color)
    color.anisotropy = 8
    color.colorSpace = THREE.NoColorSpace
    color.premultiplyAlpha = false
    const aux = new THREE.CanvasTexture(maps.aux)
    aux.colorSpace = THREE.NoColorSpace
    aux.generateMipmaps = true
    aux.minFilter = THREE.LinearMipmapLinearFilter

    const u = this.material.uniforms
    ;(u.uMap.value as THREE.Texture | null)?.dispose()
    ;(u.uAux.value as THREE.Texture | null)?.dispose()
    u.uMap.value = color
    u.uAux.value = aux
    u.uAspect.value = maps.aspect
    this.mapAspect = maps.aspect
  }

  /** Bend the plane: gentle bow + cylinder curl for the lifted corner. */
  private updateGeometry(s: StampSettings) {
    const aspect = this.mapAspect
    const key = `${s.peelAmount}|${s.peelDirection}|${s.curl}|${aspect}`
    if (key === this.geomKey) return
    this.geomKey = key

    const ang = peelAngles[s.peelDirection]
    const d = new THREE.Vector2(Math.cos(ang), Math.sin(ang))
    const pos = this.geometry.attributes.position
    const sx = aspect >= 1 ? 1 : aspect
    const sy = aspect >= 1 ? 1 / aspect : 1

    const ext = 0.5 * Math.hypot(sx, sy)
    const foldC = ext - s.peelAmount * 2 * ext
    const r = Math.max(s.curl, 0.02) * 2.2
    const perp = new THREE.Vector2(-d.y, d.x)
    const corner = new THREE.Vector2(
      Math.sign(-d.x) * sx * 0.5,
      Math.sign(-d.y) * sy * 0.5,
    )
    const qc = corner.x * perp.x + corner.y * perp.y
    const cone = 2 * Math.abs(d.x * d.y)
    const maxTheta = Math.PI * (0.55 + 0.28 * s.peelAmount)

    for (let i = 0; i < pos.count; i++) {
      const ux = ((i % (SEGS + 1)) / SEGS - 0.5) * sx
      const uy = (0.5 - Math.floor(i / (SEGS + 1)) / SEGS) * sy
      let x = ux
      let y = uy
      let z = 0
      const c = -(ux * d.x + uy * d.y)
      const u = c - foldC
      if (s.peelAmount > 0.001 && u > 0) {
        const lq = Math.abs(ux * perp.x + uy * perp.y - qc) / ext
        const rEff = r * (0.55 + cone * ((1.15 * lq * lq) / (lq + 0.45)))
        const theta = maxTheta * (1 - Math.exp(-u / rEff))
        const newC = foldC + u * Math.cos(theta)
        z = u * Math.sin(theta)
        const shift = newC - c
        x -= d.x * shift
        y -= d.y * shift
      }
      // paper never lies laser-flat
      const bx = (ux / (sx * 0.5)) ** 2
      const by = (uy / (sy * 0.5)) ** 2
      z += 0.04 * (1 - 0.5 * bx - 0.5 * by)
      pos.setXYZ(i, x, y, z)
    }
    pos.needsUpdate = true
    this.geometry.computeVertexNormals()
    this.material.uniforms.uCurlH.value = Math.max(0.15, ext * 0.7)
  }

  private busy = false

  /** True while an export owns the canvas size. */
  get exporting(): boolean {
    return this.busy
  }

  render(input: {
    settings: StampSettings
    /** 0..1: slides the stamp out of frame toward the lifted corner */
    flyOff?: number
  }) {
    if (this.busy) return
    this.renderInternal(input)
  }

  private renderInternal(input: {
    settings: StampSettings
    flyOff?: number
  }) {
    const s = input.settings
    this.updateMaps(s)
    this.updateGeometry(s)

    this.mesh.scale.set(s.size * 1.35, s.size * 1.35, 1)

    const fly = input.flyOff ?? 0
    const flyAng = peelAngles[s.peelDirection]
    this.mesh.position.set(
      Math.cos(flyAng) * fly * 2.6,
      Math.sin(flyAng) * fly * 2.6,
      fly * 0.35,
    )

    this.tilt.lerp(this.tiltTarget, 0.09)
    this.mesh.rotation.set(-this.tilt.y * 0.38, this.tilt.x * 0.42, 0)

    const u = this.material.uniforms
    const p = PRINT_PARAMS[s.print] ?? PRINT_PARAMS.engraved
    u.uRelief.value = s.relief * p.relief
    u.uReliefLod.value = p.lod
    u.uInkGloss.value = p.gloss
    u.uFiber.value = s.fiber
    u.uWatermark.value = s.watermark
    u.uToning.value = s.toning
    u.uPeelOn.value = Math.min(1, s.peelAmount / 0.05)
    ;(u.uLight.value as THREE.Vector2).set(s.light.x, s.light.y)

    const ba = this.mapAspect
    const bsx = ba >= 1 ? 1 : ba
    const bsy = ba >= 1 ? 1 / ba : 1
    this.shadowMesh.scale.set(
      s.size * 1.35 * bsx * 1.12,
      s.size * 1.35 * bsy * 1.12,
      1,
    )
    this.shadowMesh.position.set(
      -(s.light.x - 0.5) * 0.12,
      -(s.light.y - 0.5) * 0.12,
      -0.05,
    )
    this.shadowMat.opacity = 0.5 * s.shadow

    this.renderer.setSize(this.canvas.width, this.canvas.height, false)
    this.camera.aspect = this.canvas.width / this.canvas.height
    this.camera.updateProjectionMatrix()
    this.renderer.render(this.scene, this.camera)
  }

  async exportPNG(input: {
    settings: StampSettings
    /** Keep the canvas tilt (used when rotation is locked). */
    keepTilt?: boolean
  }): Promise<Blob> {
    const prevW = this.canvas.width
    const prevH = this.canvas.height
    this.busy = true
    const prevTilt = this.tilt.clone()
    const prevTarget = this.tiltTarget.clone()
    if (!input.keepTilt) {
      this.tilt.set(0, 0)
      this.tiltTarget.set(0, 0)
    }
    const size = input.settings.exportSize
    this.canvas.width = size
    this.canvas.height = size
    this.renderInternal(input)
    const blob = await new Promise<Blob>((resolve, reject) => {
      this.canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("export failed"))),
        "image/png",
      )
    })
    this.canvas.width = prevW
    this.canvas.height = prevH
    this.tilt.copy(prevTilt)
    this.tiltTarget.copy(prevTarget)
    this.busy = false
    this.render(input)
    return blob
  }

  /** Animated GIF: a seamless loop that turns the stamp in the light. */
  async exportGIF(input: {
    settings: StampSettings
    anim?: GifAnim
    background?: "transparent" | "white" | "black"
    /** Loop speed multiplier, 0.5–2; higher is faster */
    speed?: number
    onProgress?: (done: number, total: number) => void
  }): Promise<Blob> {
    const { GIFEncoder, quantize, applyPalette } = await import("gifenc")
    const anim = input.anim ?? "sweep"
    const bg = input.background ?? input.settings.background
    const speed = Math.min(2, Math.max(0.5, input.speed ?? 1))
    const size = Math.min(input.settings.exportSize, 800)
    const frames = Math.max(12, Math.round((anim === "peel" ? 48 : 40) / speed))
    const delay = 60

    const prevW = this.canvas.width
    const prevH = this.canvas.height
    const prevTilt = this.tilt.clone()
    const prevTarget = this.tiltTarget.clone()
    this.busy = true
    this.canvas.width = size
    this.canvas.height = size

    const scratch = document.createElement("canvas")
    scratch.width = size
    scratch.height = size
    const sctx = scratch.getContext("2d", { willReadFrequently: true })!

    const gif = GIFEncoder()
    for (let f = 0; f < frames; f++) {
      const t = f / frames
      let frameSettings = input.settings
      let flyOff = 0
      if (anim === "sweep") {
        const a = t * Math.PI * 2
        this.tilt.set(Math.sin(a) * 0.85, Math.cos(a) * 0.55)
      } else {
        this.tilt.set(0, 0)
        const pose = gifPeelPose(t)
        frameSettings = { ...input.settings, peelAmount: pose.peel }
        flyOff = pose.fly
      }
      this.tiltTarget.copy(this.tilt)
      this.renderInternal({ settings: frameSettings, flyOff })
      sctx.clearRect(0, 0, size, size)
      if (bg !== "transparent") {
        sctx.fillStyle = bg === "white" ? "oklch(1 0 0)" : "oklch(0 0 0)"
        sctx.fillRect(0, 0, size, size)
      }
      sctx.drawImage(this.canvas, 0, 0)
      const { data } = sctx.getImageData(0, 0, size, size)
      const format = bg === "transparent" ? "rgba4444" : "rgb444"
      const palette = quantize(data, 256, { format })
      const index = applyPalette(data, palette, format)
      let transparentIndex = -1
      for (let i = 0; i < palette.length; i++) {
        if (palette[i][3] === 0) {
          transparentIndex = i
          break
        }
      }
      gif.writeFrame(index, size, size, {
        palette,
        delay,
        transparent: bg === "transparent" && transparentIndex >= 0,
        transparentIndex: Math.max(transparentIndex, 0),
        dispose: 2,
      })
      input.onProgress?.(f + 1, frames)
      await new Promise((r) => setTimeout(r))
    }
    gif.finish()

    this.canvas.width = prevW
    this.canvas.height = prevH
    this.tilt.copy(prevTilt)
    this.tiltTarget.copy(prevTarget)
    this.busy = false
    this.render(input)
    return new Blob([gif.bytes() as unknown as BlobPart], { type: "image/gif" })
  }

  /** Looping video: MP4 where the browser supports it, WebM otherwise. */
  async exportVideo(input: {
    settings: StampSettings
    anim?: GifAnim
    background?: "transparent" | "white" | "black"
    speed?: number
    onProgress?: (done: number, total: number) => void
  }): Promise<{ blob: Blob; extension: string }> {
    const anim = input.anim ?? "sweep"
    const speed = Math.min(2, Math.max(0.5, input.speed ?? 1))
    const size = Math.min(input.settings.exportSize, 1024)
    const loopMs = (anim === "peel" ? 2880 : 2400) / speed

    const prevW = this.canvas.width
    const prevH = this.canvas.height
    const prevTilt = this.tilt.clone()
    const prevTarget = this.tiltTarget.clone()
    this.busy = true
    this.canvas.width = size
    this.canvas.height = size
    this.renderer.setClearColor(
      input.background === "black" ? 0x000000 : 0xffffff,
      1,
    )

    const stream = this.canvas.captureStream(30)
    const mimeType =
      [
        "video/mp4;codecs=avc1.42E01E",
        "video/mp4",
        "video/webm;codecs=vp9",
        "video/webm",
      ].find((m) => MediaRecorder.isTypeSupported(m)) ?? "video/webm"
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 10_000_000,
    })
    const chunks: BlobPart[] = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    const stopped = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
    })
    recorder.start()

    const t0 = performance.now()
    await new Promise<void>((resolve) => {
      const frame = () => {
        const elapsed = performance.now() - t0
        const t = Math.min(elapsed / loopMs, 1)
        let frameSettings = input.settings
        let flyOff = 0
        if (anim === "sweep") {
          const a = t * Math.PI * 2
          this.tilt.set(Math.sin(a) * 0.85, Math.cos(a) * 0.55)
        } else {
          this.tilt.set(0, 0)
          const pose = gifPeelPose(t)
          frameSettings = { ...input.settings, peelAmount: pose.peel }
          flyOff = pose.fly
        }
        this.tiltTarget.copy(this.tilt)
        this.renderInternal({ settings: frameSettings, flyOff })
        input.onProgress?.(Math.round(t * 100), 100)
        if (elapsed >= loopMs) resolve()
        else requestAnimationFrame(frame)
      }
      frame()
    })
    recorder.stop()
    const blob = await stopped

    this.renderer.setClearColor(0x000000, 0)
    this.canvas.width = prevW
    this.canvas.height = prevH
    this.tilt.copy(prevTilt)
    this.tiltTarget.copy(prevTarget)
    this.busy = false
    this.render(input)
    return { blob, extension: mimeType.includes("mp4") ? "mp4" : "webm" }
  }

  /** Export the stamp (curl geometry + perforated sheet) as a GLB. */
  async exportGLB(input: { settings: StampSettings }): Promise<Blob> {
    this.render(input)
    const { GLTFExporter } = await import(
      "three/examples/jsm/exporters/GLTFExporter.js"
    )
    const geo = this.geometry.clone()
    const mat = new THREE.MeshPhysicalMaterial({
      map: this.material.uniforms.uMap.value as THREE.Texture | null,
      transparent: true,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      metalness: 0,
      roughness: 0.82,
      sheen: 0.4,
      sheenRoughness: 0.9,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.scale.copy(this.mesh.scale)
    const exporter = new GLTFExporter()
    const result = await exporter.parseAsync(mesh, { binary: true })
    geo.dispose()
    mat.dispose()
    return new Blob([result as ArrayBuffer], { type: "model/gltf-binary" })
  }
}
