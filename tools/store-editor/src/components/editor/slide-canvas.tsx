"use client";
import * as React from "react";
import { Rnd } from "react-rnd";
import { RotateCw } from "lucide-react";
import type {
  BuiltInElementId,
  Device,
  ElementId,
  ElementTransform,
  ImageElement,
  Orientation,
  SelectedElement,
  Slide,
  TextElement,
  TextVariant,
  Theme,
} from "@/lib/types";
import {
  CANVAS,
  CARPLAY_RATIO,
  IPAD_RATIO,
  MAC_RATIO,
  MK_RATIO,
  TV_RATIO,
  WATCH_RATIO,
  carPlayW,
  ipadW,
  macW,
  phoneW,
  phoneWSmall,
  tabletLW,
  tabletPW,
  tvW,
  watchW,
} from "@/lib/constants";
import { imageElementKey, isImageElementId, toImageElementId, toTextElementId } from "@/lib/elements";
import { img } from "@/lib/image-cache";
import { pickText, resolveScreenshot } from "@/lib/locale";
import { slideColors } from "@/lib/contrast";
import { defaultTextElementFontSize, slideFontScales } from "@/lib/typography";
import {
  AndroidPhone,
  AppleTV,
  AppleWatch,
  CarPlayScreen,
  AndroidTabletL,
  AndroidTabletP,
  IPad,
  MacWindow,
  Phone,
} from "./device-frames";
import { ImageElementCanvas } from "./image-element-canvas";

type FrameComp = React.ComponentType<{
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  hideEmpty?: boolean;
}>;

export function getCanvas(device: Device, orientation: Orientation) {
  const c = CANVAS[device];
  if ((device === "android-7" || device === "android-10") && orientation === "landscape") {
    return { cW: c.wL!, cH: c.hL! };
  }
  return { cW: c.w, cH: c.h };
}

// Aspect ratio (w/h) of each device frame — must match device-frames.tsx
function getFrameAspect(device: Device, orientation: Orientation) {
  switch (device) {
    case "iphone":      return MK_RATIO;
    case "android":     return 9 / 19.5;
    case "ipad":        return IPAD_RATIO;
    case "tvos":        return TV_RATIO;
    case "watchos":     return WATCH_RATIO;
    case "carplay":     return CARPLAY_RATIO;
    case "mac":         return MAC_RATIO;
    case "android-7":
    case "android-10":  return orientation === "landscape" ? 8 / 5 : 5 / 8;
    default:            return 1;
  }
}

export function getFrameForDevice(device: Device, orientation: Orientation): {
  Comp: FrameComp;
  widthFn: (cW: number, cH: number) => number;
  smallWidthFn: (cW: number, cH: number) => number;
} {
  switch (device) {
    case "iphone":
      return { Comp: Phone, widthFn: phoneW, smallWidthFn: phoneWSmall };
    case "ipad":
      return { Comp: IPad, widthFn: ipadW, smallWidthFn: (cW, cH) => ipadW(cW, cH, 0.6) };
    case "tvos":
      return { Comp: AppleTV, widthFn: tvW, smallWidthFn: (cW, cH) => tvW(cW, cH, 0.56) };
    case "watchos":
      return { Comp: AppleWatch, widthFn: watchW, smallWidthFn: (cW, cH) => watchW(cW, cH, 0.42) };
    case "carplay":
      return { Comp: CarPlayScreen, widthFn: carPlayW, smallWidthFn: (cW, cH) => carPlayW(cW, cH, 0.7) };
    case "mac":
      return { Comp: MacWindow, widthFn: macW, smallWidthFn: (cW, cH) => macW(cW, cH, 0.46) };
    case "android":
      return { Comp: AndroidPhone, widthFn: phoneW, smallWidthFn: phoneWSmall };
    case "android-7":
    case "android-10":
      if (orientation === "landscape") {
        return { Comp: AndroidTabletL, widthFn: tabletLW, smallWidthFn: (cW, cH) => tabletLW(cW, cH, 0.5) };
      }
      return { Comp: AndroidTabletP, widthFn: tabletPW, smallWidthFn: (cW, cH) => tabletPW(cW, cH, 0.62) };
    default:
      return { Comp: Phone, widthFn: phoneW, smallWidthFn: phoneWSmall };
  }
}

type EditHandlers = {
  onLabelChange?: (v: string) => void;
  onHeadlineChange?: (v: string) => void;
  onTextElementTextChange?: (id: string, v: string) => void;
  onElementChange?: (id: ElementId, t: ElementTransform) => void;
  onSelectElement?: (id: ElementId | null) => void;
};

type Props = {
  slide: Slide;
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  fontFamily?: string;
  editable?: boolean;
  edit?: EditHandlers;
  selectedElementId?: ElementId | null;
  // Preview scale (1.0 = full size). Used so react-rnd maps drag deltas correctly
  // when the canvas is rendered inside a CSS-transformed container.
  previewScale?: number;
  /** When true, suppress the "Drop a screenshot here" placeholder. Used for export. */
  hideEmpty?: boolean;
};

type DeckEditHandlers = {
  onLabelChange?: (slideId: string, v: string) => void;
  onHeadlineChange?: (slideId: string, v: string) => void;
  onTextElementTextChange?: (slideId: string, id: string, v: string) => void;
  onElementChange?: (slideId: string, id: ElementId, t: ElementTransform) => void;
  onSelectElement?: (element: SelectedElement | null) => void;
  onSelectScreen?: (slideId: string) => void;
};

type DeckCanvasProps = {
  slides: Slide[];
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  fontFamily?: string;
  connectedCanvas?: boolean;
  editable?: boolean;
  edit?: DeckEditHandlers;
  selectedElement?: SelectedElement | null;
  activeSlideId?: string | null;
  previewScale?: number;
  hideEmpty?: boolean;
  showGuides?: boolean;
};

// ---------- Editable text helpers ----------

function EditableText({
  value,
  editable,
  onChange,
  style,
  multiline = false,
  placeholder,
  onFocus,
}: {
  value: string;
  editable?: boolean;
  onChange?: (v: string) => void;
  style?: React.CSSProperties;
  multiline?: boolean;
  placeholder?: string;
  onFocus?: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const incoming = value || "";
    if (el.textContent !== incoming && document.activeElement !== el) {
      el.textContent = incoming;
    }
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (!onChange) return;
    // A cleared contenteditable keeps a placeholder <br>, which innerText
    // reports as "\n"; that would save a blank line instead of clearing.
    const raw = e.currentTarget.textContent ? e.currentTarget.innerText : "";
    const text = (raw || "").replace(/\u00a0/g, " ");
    onChange(multiline ? text : text.replace(/\n/g, ""));
  };

  return (
    <div
      ref={ref}
      // Per-text base direction: RTL copy (ar, he, fa, ur) keeps its
      // punctuation on the correct side without flipping LTR locales.
      dir="auto"
      // Plain text only: pasted or dropped rich text would otherwise keep its
      // colours and fonts on the canvas while the export uses the plain copy.
      contentEditable={editable ? "plaintext-only" : false}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onInput={handleInput}
      onFocus={() => onFocus?.()}
      onBlur={(e) => {
        // Edits skip syncing while focused; catch up so the canvas shows what
        // will export (e.g. clearing a translation falls back to English).
        const incoming = value || "";
        if (e.currentTarget.textContent !== incoming) e.currentTarget.textContent = incoming;
      }}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onMouseDown={(e) => {
        // Allow text editing without starting an Rnd drag.
        if (editable) {
          e.stopPropagation();
          onFocus?.();
        }
      }}
      onPointerDown={(e) => {
        if (editable) e.stopPropagation();
      }}
      style={{
        outline: "none",
        whiteSpace: multiline ? "pre-wrap" : "nowrap",
        cursor: editable ? "text" : "default",
        ...style,
      }}
    />
  );
}

// ---------- Candy Pop Social ----------

const CANDY_THEME_ID = "candy-pop-social";
const INK = "#16121F";
// Pill fill/text and the hard-shadow shade per slide colour, from the style's pairing table.
const CANDY: Record<string, { pill: string; pillText: string; deep: string }> = {
  "#FF5FA8": { pill: "#2B44F0", pillText: "#FFFFFF", deep: "#D63D86" },
  "#2B44F0": { pill: "#C6F135", pillText: INK, deep: "#1A2BB0" },
  "#C6F135": { pill: "#FF5FA8", pillText: INK, deep: "#9CC41A" },
  "#FF7A1F": { pill: INK, pillText: "#C6F135", deep: "#D95E0B" },
};

function isCandy(theme: Theme) {
  return theme.id === CANDY_THEME_ID;
}

// ---------- Glossy 3D K-Beauty ----------

function isKBeauty(theme: Theme) {
  return theme.id === "glossy-3d-kbeauty-creator";
}

const KB_BG =
  "radial-gradient(ellipse 80% 50% at 50% 75%, rgba(201,138,255,.25), transparent 70%), " +
  "linear-gradient(180deg, #3B266B 0%, #5C3DAA 45%, #A567E0 100%)";
const KB_VIGNETTE = "radial-gradient(ellipse 120% 100% at 50% 50%, transparent 62%, rgba(31,14,61,.55) 100%)";

/** Deterministic starfield so every export of a slide is identical. */
function starfield(seed: string, cW: number, cH: number) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rand = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
  const dots = Array.from({ length: 80 }, () => {
    const x = rand() * cW;
    const y = rand() * cH * 0.65;
    const r = 1.5 + rand() * 2.5;
    const o = 0.1 + rand() * 0.2;
    return `<circle cx='${x.toFixed(1)}' cy='${y.toFixed(1)}' r='${r.toFixed(1)}' fill='#fff' opacity='${o.toFixed(2)}'/>`;
  }).join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${cW}' height='${cH}'>${dots}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const CHROME_FACE = "linear-gradient(180deg, #FFFFFF 0%, #FBEBD7 22%, #F1E4FF 45%, #D2B8F7 72%, #F4C2FF 100%)";

/** Chrome word: an extruded back layer, a gradient face clipped to the glyphs, a specular sheen. */
function ChromeWord({ word, k }: { word: string; k: number }) {
  const depth = Array.from({ length: 12 }, (_, i) => `0 ${(i + 1) * 1.4 * k}px 0 ${i < 6 ? "#52308E" : "#3D2374"}`).join(", ");
  const glyph: React.CSSProperties = { display: "block", whiteSpace: "nowrap" };
  return (
    <span style={{ position: "relative", display: "inline-block", transform: "rotate(-4deg)", margin: "0 .02em" }}>
      <span
        aria-hidden
        style={{
          ...glyph,
          color: "#3D2374",
          textShadow: `${depth}, 0 ${24 * k}px ${40 * k}px rgba(40,15,80,.55), 0 0 ${60 * k}px rgba(255,217,107,.55)`,
        }}
      >
        {word}
      </span>
      <span
        style={{
          ...glyph,
          position: "absolute",
          inset: 0,
          backgroundImage: CHROME_FACE,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {word}
      </span>
      <span
        aria-hidden
        style={{
          ...glyph,
          position: "absolute",
          inset: 0,
          backgroundImage: "linear-gradient(125deg, transparent 20%, rgba(255,255,255,.55) 32%, transparent 44%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {word}
      </span>
    </span>
  );
}

function KBeautyHeadline({ text, cW, scale }: { text: string; cW: number; scale: number }) {
  const k = cW / 1320;
  return (
    <div style={{ fontWeight: 900, fontSize: 164 * k * scale, lineHeight: 1.02, letterSpacing: "-0.02em", color: "#FFFFFF" }}>
      {text.split("\n").map((line, i) => (
        <div key={i} style={{ whiteSpace: "nowrap" }}>
          {line.split(/(\[[^\]]+\])/).map((part, j) =>
            part.startsWith("[") && part.endsWith("]") ? (
              <ChromeWord key={j} word={part.slice(1, -1)} k={k * scale} />
            ) : (
              <span key={j}>{part}</span>
            ),
          )}
        </div>
      ))}
    </div>
  );
}

function candyBg(theme: Theme, slide: Slide) {
  return (slide.backgroundColor || (slide.inverted ? theme.bgAlt : theme.bg)).toUpperCase();
}

function candyTokens(theme: Theme, slide: Slide) {
  return CANDY[candyBg(theme, slide)] ?? { pill: "#FFE23D", pillText: INK, deep: shade(candyBg(theme, slide), -18) };
}

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function starburstSvg(fill: string) {
  const points = 14;
  const pts = Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 === 0 ? 50 : 40;
    const a = (Math.PI * i) / points - Math.PI / 2;
    return `${(55 + r * Math.cos(a)).toFixed(2)},${(55 + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 115 115'><polygon points='${pts}' fill='${INK}' transform='translate(4.5 5.5)'/><polygon points='${pts}' fill='${fill}' stroke='${INK}' stroke-width='3.2' stroke-linejoin='round'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** `[word]` in a headline line becomes the one pill-boxed emphasis word. */
function PillHeadline({ text, cW, scale, color, pill, pillText }: {
  text: string; cW: number; scale: number; color: string; pill: string; pillText: string;
}) {
  const k = cW / 1320;
  return (
    <div
      style={{
        fontFamily: "var(--font-display), sans-serif",
        fontWeight: 800,
        fontVariationSettings: "'opsz' 96",
        fontSize: 232 * k * scale,
        lineHeight: 0.9,
        letterSpacing: "-0.035em",
        color,
      }}
    >
      {text.split("\n").map((line, i) => (
        <div key={i} style={{ whiteSpace: "nowrap", marginTop: i === 0 ? 0 : 22 * k * scale }}>
          {line.split(/(\[[^\]]+\])/).map((part, j) =>
            part.startsWith("[") && part.endsWith("]") ? (
              <span
                key={j}
                style={{
                  display: "inline-block",
                  background: pill,
                  color: pillText,
                  borderRadius: 999,
                  padding: "0 .2em .06em",
                  margin: "0 .04em",
                  border: `${7 * k}px solid ${INK}`,
                  boxShadow: `${12 * k}px ${14 * k}px 0 ${INK}`,
                  transform: "rotate(-3deg)",
                }}
              >
                {part.slice(1, -1)}
              </span>
            ) : (
              <span key={j}>{part}</span>
            ),
          )}
        </div>
      ))}
    </div>
  );
}

function variantStyle(variant: TextVariant, k: number, color?: string): React.CSSProperties {
  const ui = "var(--font-ui), sans-serif";
  const sticker = { border: `${6 * k}px solid ${INK}`, boxShadow: `${10 * k}px ${12 * k}px 0 ${INK}` };
  const bubble: React.CSSProperties = {
    ...sticker,
    width: "auto",
    fontFamily: ui,
    fontWeight: 700,
    fontSize: 52 * k,
    lineHeight: 1.12,
    padding: `${30 * k}px ${42 * k}px ${32 * k}px`,
    borderRadius: 56 * k,
    textShadow: "none",
    textAlign: "left",
  };
  switch (variant) {
    case "friend":
      return { ...bubble, background: "#FFFFFF", color: INK, borderBottomLeftRadius: 12 * k };
    case "loud":
      return { ...bubble, background: "#FF5FA8", color: INK, borderBottomLeftRadius: 12 * k };
    case "you":
      return { ...bubble, background: "#2B44F0", color: "#FFFFFF", borderBottomRightRadius: 12 * k };
    case "reaction":
      return {
        width: "auto",
        fontFamily: ui,
        fontWeight: 800,
        fontSize: 42 * k,
        lineHeight: 1,
        background: color || "#FFFFFF",
        color: INK,
        border: `${5 * k}px solid ${INK}`,
        borderRadius: 999,
        padding: `${14 * k}px ${26 * k}px`,
        boxShadow: `${6 * k}px ${7 * k}px 0 ${INK}`,
        textShadow: "none",
      };
    case "tag":
      return {
        width: "auto",
        fontFamily: ui,
        fontWeight: 800,
        fontSize: 50 * k,
        lineHeight: 1,
        color: INK,
        textShadow: "none",
      };
    case "hashtag":
      return {
        width: "auto",
        fontWeight: 900,
        fontSize: 56 * k,
        lineHeight: 1,
        letterSpacing: "0.01em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        background: "#FBE254",
        color: "#0A0A0A",
        borderRadius: 26 * k,
        padding: `${20 * k}px ${34 * k}px`,
        boxShadow: `0 ${8 * k}px ${20 * k}px rgba(0,0,0,.25), inset 0 ${2 * k}px 0 rgba(255,255,255,.8)`,
        textShadow: "none",
      };
    case "burst":
      return {
        fontFamily: "var(--font-display), sans-serif",
        fontWeight: 800,
        fontSize: 48 * k,
        lineHeight: 0.95,
        color: INK,
        textShadow: "none",
        padding: "0 18%",
      };
  }
}

// ---------- Caption (label + headline) ----------

function Caption({
  cW,
  cH,
  slide,
  theme,
  locale,
  editable,
  edit,
  align = "center",
  inverted,
  onFocus,
}: {
  cW: number;
  cH: number;
  slide: Slide;
  theme: Theme;
  locale: string;
  editable?: boolean;
  edit?: EditHandlers;
  align?: "center" | "left";
  inverted?: boolean;
  onFocus?: () => void;
}) {
  const { fg, accent } = slideColors(theme, { inverted, backgroundColor: slide.backgroundColor });
  const { labelScale, headlineScale } = slideFontScales(slide);
  // Scale typography off the *shorter* dimension so landscape layouts don't
  // produce headlines so tall they overlap the device frame.
  const unit = Math.min(cW, cH);
  if (isKBeauty(theme)) {
    const k = cW / 1320;
    const sub = pickText(slide.label, locale);
    return (
      <div style={{ textAlign: "start", position: "relative", width: "100%" }} onMouseDown={() => onFocus?.()}>
        <KBeautyHeadline text={pickText(slide.headline, locale)} cW={cW} scale={headlineScale} />
        {sub ? (
          <div
            style={{
              marginTop: 36 * k,
              fontWeight: 600,
              fontSize: 56 * k * labelScale,
              lineHeight: 1.2,
              whiteSpace: "pre-wrap",
              color: "rgba(255,255,255,.88)",
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
    );
  }
  if (isCandy(theme)) {
    // Edited from the inspector: the pill needs real markup, which a
    // plain-text contenteditable cannot hold.
    const tokens = candyTokens(theme, slide);
    const k = cW / 1320;
    const sub = pickText(slide.label, locale);
    return (
      <div style={{ textAlign: "start", position: "relative", width: "100%" }} onMouseDown={() => onFocus?.()}>
        <PillHeadline
          text={pickText(slide.headline, locale)}
          cW={cW}
          scale={headlineScale}
          color={fg}
          pill={tokens.pill}
          pillText={tokens.pillText}
        />
        {sub ? (
          <div
            style={{
              marginTop: 44 * k,
              fontFamily: "var(--font-ui), sans-serif",
              fontWeight: 700,
              fontSize: 52 * k * labelScale,
              lineHeight: 1.18,
              letterSpacing: "-0.01em",
              whiteSpace: "pre-wrap",
              color: fg,
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
    );
  }
  return (
    // "start" rather than "left" so a left-set caption hugs the right edge in RTL.
    <div style={{ textAlign: align === "left" ? "start" : align, position: "relative", width: "100%" }}>
      <EditableText
        value={pickText(slide.label, locale)}
        editable={editable}
        onChange={edit?.onLabelChange}
        onFocus={onFocus}
        placeholder="LABEL"
        style={{
          // Floor keeps the label legible on the 422×514 Apple Watch canvas;
          // the per-slide scale is applied on top of the floored base.
          fontSize: Math.max(unit * 0.028, 16) * labelScale,
          fontWeight: 600,
          letterSpacing: Math.max(unit * 0.0015, 0.8) * labelScale,
          color: accent,
          textTransform: "uppercase",
          marginBottom: unit * 0.018,
          minHeight: unit * 0.03,
        }}
      />
      <EditableText
        value={pickText(slide.headline, locale)}
        editable={editable}
        multiline
        onChange={edit?.onHeadlineChange}
        onFocus={onFocus}
        placeholder="Headline goes here"
        style={{
          fontSize: unit * 0.092 * headlineScale,
          fontWeight: 700,
          lineHeight: 0.96,
          letterSpacing: -unit * 0.001 * headlineScale,
          color: fg,
        }}
      />
    </div>
  );
}

// ---------- Background ----------

function backgroundFor(theme: Theme, inverted?: boolean, customColor?: string) {
  if (customColor) {
    return `linear-gradient(160deg, ${customColor} 0%, ${shade(customColor, -6)} 100%)`;
  }
  if (inverted) {
    return `linear-gradient(160deg, ${theme.bgAlt} 0%, ${shade(theme.bgAlt, -8)} 100%)`;
  }
  return `linear-gradient(160deg, ${theme.bg} 0%, ${shade(theme.bg, -6)} 100%)`;
}

function shade(hex: string, percent: number) {
  const c = hex.replace("#", "");
  const num = parseInt(c.length === 3 ? c.split("").map((x) => x + x).join("") : c, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const amt = Math.round((255 * percent) / 100);
  r = Math.max(0, Math.min(255, r + amt));
  g = Math.max(0, Math.min(255, g + amt));
  b = Math.max(0, Math.min(255, b + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// ---------- Decorative blob ----------

function Blob({
  cW,
  color,
  x,
  y,
  size,
  opacity = 0.4,
}: {
  cW: number;
  color: string;
  x: number;
  y: number;
  size: number;
  opacity?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}%`,
        aspectRatio: "1 / 1",
        background: color,
        borderRadius: "50%",
        filter: `blur(${cW * 0.06}px)`,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

// ---------- Default element rects per layout ----------

type Rect = { x: number; y: number; width: number; height: number };
type LayoutRects = {
  caption?: Rect & { align?: "center" | "left" };
  device?: Rect;
  deviceSecondary?: Rect;
};

function getDefaultRects(
  layout: Slide["layout"],
  cW: number,
  cH: number,
  frameAspect: number,
  fwFrac: number,
  fwSmallFrac: number,
  // Phones and tablets are deliberately hung past the canvas edge so they bleed off
  // it. When true (TV, watch, CarPlay, Mac), every device rect stays fully inside the
  // canvas instead.
  contain = false,
): LayoutRects {
  const deviceW = fwFrac * cW;
  const deviceH = deviceW / frameAspect;
  const smallW = fwSmallFrac * cW;
  const smallH = smallW / frameAspect;
  const capW = cW * 0.84;
  const capH = cH * 0.28;

  switch (layout) {
    case "hero":
      return {
        caption: { x: cW * 0.08, y: cH * 0.09, width: capW, height: capH, align: "center" },
        device: {
          x: (cW - deviceW) / 2,
          y: contain ? cH - deviceH - cH * 0.05 : cH - deviceH + deviceH * 0.15,
          width: deviceW,
          height: deviceH,
        },
      };
    case "device-bottom":
      return {
        caption: { x: cW * 0.08, y: cH * 0.08, width: capW, height: capH, align: "center" },
        device: {
          x: (cW - deviceW) / 2,
          y: cH - deviceH - cH * 0.02,
          width: deviceW,
          height: deviceH,
        },
      };
    case "device-top":
      return {
        caption: { x: cW * 0.08, y: cH * 0.65, width: capW, height: capH, align: "center" },
        device: {
          x: (cW - deviceW) / 2,
          y: contain ? cH * 0.05 : -cH * 0.1,
          width: deviceW,
          height: deviceH,
        },
      };
    case "two-devices":
      return {
        caption: { x: cW * 0.08, y: cH * 0.08, width: capW, height: capH, align: "center" },
        deviceSecondary: {
          x: contain ? cW * 0.04 : -cW * 0.06,
          y: cH - smallH - cH * 0.05,
          width: smallW,
          height: smallH,
        },
        device: {
          x: contain ? cW - deviceW * 0.9 - cW * 0.04 : cW - deviceW * 0.9 + cW * 0.06,
          y: contain ? cH - (deviceW * 0.9) / frameAspect - cH * 0.05 : cH - deviceH * 0.9 - cH * 0.02,
          width: deviceW * 0.9,
          height: (deviceW * 0.9) / frameAspect,
        },
      };
    case "no-device":
      return {
        caption: {
          x: cW * 0.1,
          y: cH * 0.35,
          width: cW * 0.8,
          height: cH * 0.3,
          align: "center",
        },
      };
    case "split-landscape": {
      // Contained devices sit beside the caption instead of sliding under it.
      // The caption is beside it, not above, so it can be taller than elsewhere.
      const splitW = contain ? Math.min(cW * 0.5, cH * 0.84 * frameAspect) : deviceW;
      const splitH = splitW / frameAspect;
      return {
        caption: {
          x: cW * 0.05,
          y: cH * 0.25,
          width: cW * 0.38,
          height: cH * 0.5,
          align: "left",
        },
        device: {
          x: contain ? cW - splitW - cW * 0.05 : cW - deviceW + cW * 0.03,
          y: (cH - splitH) / 2,
          width: splitW,
          height: splitH,
        },
      };
    }
    default:
      return {};
  }
}

function rectFor(
  id: BuiltInElementId,
  slide: Slide,
  defaults: LayoutRects,
): (Rect & { align?: "center" | "left" }) | undefined {
  const saved = slide.transforms?.[id];
  const def = defaults[id];
  if (!def && !saved) return undefined;
  if (!saved) return def;
  return {
    x: saved.x,
    y: saved.y,
    width: saved.width,
    height: saved.height,
    align: (def as { align?: "center" | "left" } | undefined)?.align,
  };
}

// Devices whose frame must never be cropped by the canvas edge. A clipped TV,
// head unit, watch face or Mac window reads as a mistake, not as a deliberate bleed.
const CONTAINED_DEVICES: ReadonlySet<Device> = new Set<Device>(["tvos", "watchos", "carplay", "mac"]);

function getSlideGeometry(slide: Slide, device: Device, orientation: Orientation) {
  const { cW, cH } = getCanvas(device, orientation);
  const { Comp: Frame, widthFn, smallWidthFn } = getFrameForDevice(device, orientation);
  const frameAspect = getFrameAspect(device, orientation);
  const fwFrac = widthFn(cW, cH);
  const fwSmallFrac = smallWidthFn(cW, cH);
  const defaults = getDefaultRects(
    slide.layout, cW, cH, frameAspect, fwFrac, fwSmallFrac,
    CONTAINED_DEVICES.has(device),
  );
  return { cW, cH, Frame, frameAspect, defaults };
}

export function getElementTransform(
  slide: Slide,
  device: Device,
  orientation: Orientation,
  id: ElementId,
): ElementTransform | undefined {
  if (id.startsWith("text:")) {
    const textId = id.slice("text:".length);
    const textElement = slide.textElements?.find((element) => element.id === textId);
    return textElement?.transform;
  }
  if (isImageElementId(id)) {
    const imageId = imageElementKey(id);
    return slide.imageElements?.find((element) => element.id === imageId)?.transform;
  }
  const { defaults } = getSlideGeometry(slide, device, orientation);
  const rect = rectFor(id as BuiltInElementId, slide, defaults);
  if (!rect) return undefined;
  const saved = slide.transforms?.[id as BuiltInElementId];
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    rotation: saved?.rotation ?? 0,
    zIndex: saved?.zIndex ?? defaultElementZ(id as BuiltInElementId),
  };
}

function defaultElementZ(id: BuiltInElementId): number {
  if (id === "deviceSecondary") return 2;
  if (id === "device") return 3;
  return 4;
}

// ---------- Main single-screen canvas ----------

export function SlideCanvas({
  slide,
  device,
  orientation,
  theme,
  locale,
  appName,
  appIcon,
  fontFamily,
  editable,
  edit,
  selectedElementId = null,
  previewScale = 1,
  hideEmpty,
}: Props) {
  const { cW, cH } = getCanvas(device, orientation);

  if (slide.layout === "feature-graphic" || device === "feature-graphic") {
    return (
      <div style={{ width: "100%", height: "100%", fontFamily }}>
        <FeatureGraphicCanvas
          slide={slide}
          cW={cW}
          theme={theme}
          locale={locale}
          appName={appName}
          appIcon={appIcon}
          editable={editable}
          edit={edit}
        />
      </div>
    );
  }

  const handleBackgroundMouseDown = editable
    ? (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) edit?.onSelectElement?.(null);
      }
    : undefined;

  return (
    <div
      onMouseDown={handleBackgroundMouseDown}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        fontFamily,
      }}
    >
      <SlideBackground slide={slide} cW={cW} cH={cH} theme={theme} />
      <SlideElements
        slide={slide}
        device={device}
        orientation={orientation}
        theme={theme}
        locale={locale}
        editable={editable}
        edit={edit}
        selectedElementId={selectedElementId}
        previewScale={previewScale}
        hideEmpty={hideEmpty}
        screenX={0}
        boundsW={cW}
        boundsH={cH}
        allowCrossScreen={false}
      />
    </div>
  );
}

// ---------- Connected deck canvas ----------

export function DeckCanvas({
  slides,
  device,
  orientation,
  theme,
  locale,
  appName,
  appIcon,
  fontFamily,
  connectedCanvas = true,
  editable,
  edit,
  selectedElement = null,
  activeSlideId = null,
  previewScale = 1,
  hideEmpty,
  showGuides = false,
}: DeckCanvasProps) {
  const { cW, cH } = getCanvas(device, orientation);
  const totalW = Math.max(1, slides.length) * cW;

  return (
    <div
      style={{
        width: totalW,
        height: cH,
        position: "relative",
        overflow: "hidden",
        fontFamily,
      }}
    >
      {slides.map((slide, index) => {
        const screenX = index * cW;
        const active = activeSlideId === slide.id;
        if (slide.layout === "feature-graphic" || device === "feature-graphic") {
          return (
            <div
              key={`${slide.id}-feature`}
              onMouseDown={(e) => {
                if (!editable || e.defaultPrevented) return;
                edit?.onSelectScreen?.(slide.id);
                edit?.onSelectElement?.(null);
              }}
              style={{
                position: "absolute",
                left: screenX,
                top: 0,
                width: cW,
                height: cH,
                overflow: "hidden",
              }}
            >
              <FeatureGraphicCanvas
                slide={slide}
                cW={cW}
                theme={theme}
                locale={locale}
                appName={appName}
                appIcon={appIcon}
                editable={editable}
                edit={{
                  onHeadlineChange: (v) => edit?.onHeadlineChange?.(slide.id, v),
                  onSelectElement: () => edit?.onSelectScreen?.(slide.id),
                }}
              />
              {showGuides && <ScreenGuide cW={cW} cH={cH} index={index} active={active} />}
            </div>
          );
        }
        return (
          <div
            key={`${slide.id}-bg`}
            onMouseDown={(e) => {
              if (!editable || e.defaultPrevented) return;
              edit?.onSelectScreen?.(slide.id);
              edit?.onSelectElement?.(null);
            }}
            style={{
              position: "absolute",
              left: screenX,
              top: 0,
              width: cW,
              height: cH,
              overflow: "hidden",
            }}
          >
            <SlideBackground slide={slide} cW={cW} cH={cH} theme={theme} />
            {showGuides && <ScreenGuide cW={cW} cH={cH} index={index} active={active} />}
          </div>
        );
      })}

      {slides.map((slide, index) => {
        if (slide.layout === "feature-graphic" || device === "feature-graphic") return null;
        const selectedElementId =
          selectedElement?.slideId === slide.id ? selectedElement.elementId : null;
        const perSlideEdit: EditHandlers | undefined = editable
          ? {
              onLabelChange: (v) => edit?.onLabelChange?.(slide.id, v),
              onHeadlineChange: (v) => edit?.onHeadlineChange?.(slide.id, v),
              onTextElementTextChange: (id, v) => edit?.onTextElementTextChange?.(slide.id, id, v),
              onElementChange: (id, t) => edit?.onElementChange?.(slide.id, id, t),
              onSelectElement: (id) => {
                edit?.onSelectScreen?.(slide.id);
                edit?.onSelectElement?.(id ? { slideId: slide.id, elementId: id } : null);
              },
            }
          : undefined;

        const elements = (
          <SlideElements
            key={`${slide.id}-elements`}
            slide={slide}
            device={device}
            orientation={orientation}
            theme={theme}
            locale={locale}
            editable={editable}
            edit={perSlideEdit}
            selectedElementId={selectedElementId}
            previewScale={previewScale}
            hideEmpty={hideEmpty}
            screenX={connectedCanvas ? index * cW : 0}
            boundsW={connectedCanvas ? totalW : cW}
            boundsH={cH}
            allowCrossScreen={connectedCanvas}
          />
        );
        if (connectedCanvas) return elements;
        return (
          <div
            key={`${slide.id}-elements-isolated`}
            style={{
              position: "absolute",
              left: index * cW,
              top: 0,
              width: cW,
              height: cH,
              overflow: "hidden",
            }}
          >
            {elements}
          </div>
        );
      })}
    </div>
  );
}

function SlideBackground({
  slide,
  cW,
  cH,
  theme,
}: {
  slide: Slide;
  cW: number;
  cH: number;
  theme: Theme;
}) {
  const inverted = !!slide.inverted;
  if (isKBeauty(theme)) {
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: KB_BG }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: starfield(slide.id, cW, cH) }} />
        <div style={{ position: "absolute", inset: 0, background: KB_VIGNETTE }} />
      </div>
    );
  }
  if (isCandy(theme)) {
    // One flat colour per slide plus grain; the style forbids gradients and blobs.
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: candyBg(theme, slide) }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: GRAIN,
            backgroundSize: `${cW * 0.18}px`,
            mixBlendMode: "overlay",
            opacity: 0.05,
          }}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: backgroundFor(theme, inverted, slide.backgroundColor),
        color: slideColors(theme, slide).fg,
      }}
    >
      <Blob cW={cW} color={theme.accent} x={-15} y={-10} size={55} opacity={inverted ? 0.25 : 0.32} />
      <Blob cW={cW} color={theme.accent} x={70} y={75} size={45} opacity={inverted ? 0.18 : 0.25} />
    </div>
  );
}

function ScreenGuide({
  cW,
  cH,
  index,
  active,
}: {
  cW: number;
  cH: number;
  index: number;
  active: boolean;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        outline: `${active ? Math.max(4, cW * 0.003) : Math.max(2, cW * 0.0015)}px solid ${
          active ? "rgba(91, 124, 250, 0.95)" : "rgba(15, 23, 42, 0.22)"
        }`,
        outlineOffset: active ? -Math.max(4, cW * 0.003) : -Math.max(2, cW * 0.0015),
        boxShadow: active
          ? "inset 0 0 0 9999px rgba(91, 124, 250, 0.03)"
          : "inset 0 0 0 1px rgba(255, 255, 255, 0.22)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: cW * 0.035,
          top: cH * 0.024,
          borderRadius: cW * 0.018,
          padding: `${cH * 0.006}px ${cW * 0.018}px`,
          background: active ? "rgba(91, 124, 250, 0.92)" : "rgba(15, 23, 42, 0.72)",
          color: "white",
          fontSize: Math.max(24, cW * 0.022),
          lineHeight: 1,
          fontWeight: 700,
          letterSpacing: 0,
        }}
      >
        {index + 1}
      </div>
    </div>
  );
}

function FeatureGraphicCanvas({
  slide,
  cW,
  theme,
  locale,
  appName,
  appIcon,
  editable,
  edit,
}: {
  slide: Slide;
  cW: number;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  editable?: boolean;
  edit?: EditHandlers;
}) {
  const { headlineScale, appNameScale } = slideFontScales(slide);
  const inverted = slide.inverted ?? true;
  const bg = inverted ? theme.bgAlt : theme.bg;
  const colors = slideColors(theme, { ...slide, inverted });
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: slide.backgroundColor || `linear-gradient(135deg, ${bg} 0%, ${shade(bg, -10)} 50%, ${theme.accent} 200%)`,
        display: "flex",
        alignItems: "center",
        padding: `0 ${cW * 0.06}px`,
        color: colors.fg,
      }}
    >
      <Blob cW={cW} color={theme.accent} x={70} y={20} size={50} opacity={0.45} />
      <div style={{ display: "flex", alignItems: "center", gap: cW * 0.03, zIndex: 2 }}>
        {appIcon && img(appIcon) ? (
          <img
            src={img(appIcon)}
            alt=""
            style={{
              width: cW * 0.13,
              height: cW * 0.13,
              borderRadius: cW * 0.022,
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            }}
            draggable={false}
          />
        ) : (
          <div
            aria-hidden
            style={{
              width: cW * 0.13,
              height: cW * 0.13,
              borderRadius: cW * 0.022,
              background: `linear-gradient(135deg, ${theme.accent}55, ${theme.accent})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.fg,
              fontWeight: 800,
              fontSize: cW * 0.07,
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            }}
          >
            {(appName || "A").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <div style={{ fontSize: cW * 0.06 * appNameScale, fontWeight: 800, lineHeight: 1.05 }}>{appName || "App"}</div>
          <EditableText
            value={pickText(slide.headline, locale)}
            editable={editable}
            multiline
            onChange={edit?.onHeadlineChange}
            onFocus={() => edit?.onSelectElement?.("caption")}
            style={{
              fontSize: cW * 0.028 * headlineScale,
              color: colors.fg,
              opacity: 0.85,
              marginTop: cW * 0.012,
              lineHeight: 1.25,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SlideElements({
  slide,
  device,
  orientation,
  theme,
  locale,
  editable,
  edit,
  selectedElementId,
  previewScale,
  hideEmpty,
  screenX,
  boundsW,
  boundsH,
  allowCrossScreen,
}: {
  slide: Slide;
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  editable?: boolean;
  edit?: EditHandlers;
  selectedElementId: ElementId | null;
  previewScale: number;
  hideEmpty?: boolean;
  screenX: number;
  boundsW: number;
  boundsH: number;
  allowCrossScreen: boolean;
}) {
  const screenshot = resolveScreenshot(slide.screenshot, locale);
  const screenshotSecondary = resolveScreenshot(slide.screenshotSecondary, locale);
  const { cW, cH, Frame, frameAspect, defaults } = getSlideGeometry(slide, device, orientation);
  const inverted = !!slide.inverted;
  const colors = slideColors(theme, slide);
  const captionRect = rectFor("caption", slide, defaults);
  const deviceRect = rectFor("device", slide, defaults);
  const secondaryRect = rectFor("deviceSecondary", slide, defaults);

  function toGlobal(rect: Rect): Rect {
    return { ...rect, x: rect.x + screenX };
  }

  function toLocal(t: ElementTransform): ElementTransform {
    return { ...t, x: t.x - screenX };
  }

  function renderCaption() {
    if (!captionRect) return null;
    const saved = slide.transforms?.caption;
    const rotation = saved?.rotation ?? 0;
    const zIndex = saved?.zIndex ?? 4;
    const inner = (
      <Caption
        cW={cW}
        cH={cH}
        slide={slide}
        theme={theme}
        locale={locale}
        editable={editable}
        edit={edit}
        align={captionRect.align || "center"}
        inverted={inverted}
        onFocus={() => edit?.onSelectElement?.("caption")}
      />
    );
    return (
      <Movable
        rect={toGlobal(captionRect)}
        boundsW={boundsW}
        boundsH={boundsH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        onChange={(t) =>
          edit?.onElementChange?.(
            "caption",
            toLocal({
              ...t,
              rotation: t.rotation ?? rotation,
              zIndex: t.zIndex ?? zIndex,
            }),
          )
        }
        zIndex={zIndex}
        selected={selectedElementId === "caption"}
        onSelect={() => edit?.onSelectElement?.("caption")}
        allowOverflow={allowCrossScreen}
      >
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "flex-start" }}>
          {inner}
        </div>
      </Movable>
    );
  }

  function renderDevice(id: "device" | "deviceSecondary", rect: Rect, src: string, extraStyle?: React.CSSProperties) {
    const saved = slide.transforms?.[id];
    const rotation = saved?.rotation ?? 0;
    const zIndex = saved?.zIndex ?? (id === "deviceSecondary" ? 2 : 3);
    return (
      <Movable
        rect={toGlobal(rect)}
        boundsW={boundsW}
        boundsH={boundsH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        onChange={(t) =>
          edit?.onElementChange?.(
            id,
            toLocal({
              ...t,
              rotation: t.rotation ?? rotation,
              zIndex: t.zIndex ?? zIndex,
            }),
          )
        }
        lockAspectRatio={frameAspect}
        zIndex={zIndex}
        allowOverflow
        selected={selectedElementId === id}
        onSelect={() => edit?.onSelectElement?.(id)}
      >
        <Frame
          src={src}
          hideEmpty={hideEmpty}
          style={{
            width: "100%",
            height: "100%",
            ...(isKBeauty(theme)
              ? {
                  filter: `drop-shadow(0 0 ${80 * (cW / 1320)}px rgba(201,138,255,.45)) drop-shadow(0 ${30 * (cW / 1320)}px ${60 * (cW / 1320)}px rgba(15,5,40,.6))`,
                }
              : {}),
            ...(isCandy(theme)
              ? {
                  filter: `drop-shadow(${26 * (cW / 1320)}px ${30 * (cW / 1320)}px 0 ${candyTokens(theme, slide).deep}) drop-shadow(0 ${30 * (cW / 1320)}px ${50 * (cW / 1320)}px rgba(20,10,40,.28))`,
                }
              : {}),
            ...extraStyle,
          }}
        />
      </Movable>
    );
  }

  function renderTextElement(textElement: TextElement, index: number) {
    const elementId = toTextElementId(textElement.id);
    const rect = textElement.transform;
    const rotation = rect.rotation ?? 0;
    const zIndex = rect.zIndex ?? 5 + index;
    const textColor = textElement.color || colors.fg;
    return (
      <Movable
        key={textElement.id}
        rect={toGlobal(rect)}
        boundsW={boundsW}
        boundsH={boundsH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        onChange={(t) =>
          edit?.onElementChange?.(
            elementId,
            toLocal({
              ...t,
              rotation: t.rotation ?? rotation,
              zIndex: t.zIndex ?? zIndex,
            }),
          )
        }
        zIndex={zIndex}
        selected={selectedElementId === elementId}
        onSelect={() => edit?.onSelectElement?.(elementId)}
        allowOverflow={allowCrossScreen}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent:
              textElement.align === "right"
                ? "flex-end"
                : textElement.align === "left"
                  ? "flex-start"
                  : "center",
            padding: `${Math.min(cW, cH) * 0.012}px`,
            ...(textElement.variant === "burst"
              ? {
                  backgroundImage: starburstSvg(textElement.color || "#FFE23D"),
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  textAlign: "center",
                }
              : {}),
          }}
        >
          {textElement.variant === "tag" ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18 * (cW / 1320),
                background: "#FFFFFF",
                border: isKBeauty(theme) ? "none" : `${6 * (cW / 1320)}px solid ${INK}`,
                borderRadius: 999,
                padding: `${12 * (cW / 1320)}px ${34 * (cW / 1320)}px ${12 * (cW / 1320)}px ${14 * (cW / 1320)}px`,
                boxShadow: isKBeauty(theme)
                  ? `0 ${8 * (cW / 1320)}px ${20 * (cW / 1320)}px rgba(15,5,40,.35)`
                  : `${8 * (cW / 1320)}px ${10 * (cW / 1320)}px 0 ${INK}`,
              }}
            >
              <img
                src={img("/app-icon.png")}
                alt=""
                draggable={false}
                style={{ width: 74 * (cW / 1320), height: 74 * (cW / 1320), borderRadius: 18 * (cW / 1320) }}
              />
              <EditableText
                value={pickText(textElement.text, locale)}
                editable={editable}
                onChange={(value) => edit?.onTextElementTextChange?.(textElement.id, value)}
                onFocus={() => edit?.onSelectElement?.(elementId)}
                placeholder="Text"
                style={variantStyle("tag", cW / 1320)}
              />
            </div>
          ) : (
            <EditableText
              value={pickText(textElement.text, locale)}
              editable={editable}
              multiline
              onChange={(value) => edit?.onTextElementTextChange?.(textElement.id, value)}
              onFocus={() => edit?.onSelectElement?.(elementId)}
              placeholder="Text"
              style={{
                width: "100%",
                color: textColor,
                fontSize: textElement.fontSize ?? defaultTextElementFontSize(cW, cH),
                fontWeight: textElement.fontWeight ?? 700,
                lineHeight: 1.05,
                textAlign: textElement.align ?? "center",
                textShadow: colors.dark ? "0 2px 18px rgba(0,0,0,0.22)" : "0 2px 18px rgba(255,255,255,0.2)",
                ...(textElement.variant ? variantStyle(textElement.variant, cW / 1320, textElement.color) : {}),
              }}
            />
          )}
        </div>
      </Movable>
    );
  }

  function renderImageElement(imageElement: ImageElement, index: number) {
    const elementId = toImageElementId(imageElement.id);
    const rect = imageElement.transform;
    const rotation = rect.rotation ?? 0;
    const zIndex = rect.zIndex ?? 5 + index;
    return (
      <Movable
        key={imageElement.id}
        rect={toGlobal(rect)}
        boundsW={boundsW}
        boundsH={boundsH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        onChange={(t) =>
          edit?.onElementChange?.(
            elementId,
            toLocal({
              ...t,
              rotation: t.rotation ?? rotation,
              zIndex: t.zIndex ?? zIndex,
            }),
          )
        }
        zIndex={zIndex}
        selected={selectedElementId === elementId}
        onSelect={() => edit?.onSelectElement?.(elementId)}
        allowOverflow={allowCrossScreen}
      >
        <ImageElementCanvas element={imageElement} editable={editable} />
      </Movable>
    );
  }

  return (
    <>
      {secondaryRect &&
        renderDevice(
          "deviceSecondary",
          secondaryRect,
          screenshotSecondary || screenshot,
          { opacity: 0.85 },
        )}
      {deviceRect && renderDevice("device", deviceRect, screenshot)}
      {renderCaption()}
      {(slide.imageElements || []).map(renderImageElement)}
      {(slide.textElements || []).map(renderTextElement)}
    </>
  );
}

// ---------- Movable wrapper ----------

// Fraction of an element's width/height that must remain inside the canvas
// when overflow is allowed. Keeps a graspable handle visible so the user can
// always drag the element back onto the canvas.
const MIN_VISIBLE_FRAC = 0.1;

function clampRect(
  r: { x: number; y: number; width: number; height: number },
  boundsW: number,
  boundsH: number,
  allowOverflow = false,
) {
  if (allowOverflow) {
    const width = r.width;
    const height = r.height;
    const minVisX = Math.max(8, width * MIN_VISIBLE_FRAC);
    const minVisY = Math.max(8, height * MIN_VISIBLE_FRAC);
    const x = Math.max(-(width - minVisX), Math.min(r.x, boundsW - minVisX));
    const y = Math.max(-(height - minVisY), Math.min(r.y, boundsH - minVisY));
    return { x, y, width, height };
  }
  const width = Math.min(r.width, boundsW);
  const height = Math.min(r.height, boundsH);
  const x = Math.max(0, Math.min(r.x, boundsW - width));
  const y = Math.max(0, Math.min(r.y, boundsH - height));
  return { x, y, width, height };
}

function Movable({
  rect,
  boundsW,
  boundsH,
  editable,
  previewScale,
  onChange,
  children,
  lockAspectRatio,
  zIndex,
  rotation = 0,
  allowOverflow = false,
  selected = false,
  onSelect,
}: {
  rect: Rect;
  boundsW: number;
  boundsH: number;
  editable?: boolean;
  previewScale: number;
  onChange: (t: ElementTransform) => void;
  children: React.ReactNode;
  lockAspectRatio?: number | boolean;
  zIndex?: number;
  rotation?: number;
  allowOverflow?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const rotationRef = React.useRef(rotation);
  React.useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  function startRotate(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    onSelect?.();

    const root = e.currentTarget.closest(".rnd-editable") as HTMLElement | null;
    if (!root) return;
    const box = root.getBoundingClientRect();
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const startAngle = pointerAngle(e.clientX, e.clientY, centerX, centerY);
    const startRotation = rotationRef.current;

    const handleMove = (event: PointerEvent) => {
      event.preventDefault();
      const nextRotation = normalizeRotation(
        startRotation + pointerAngle(event.clientX, event.clientY, centerX, centerY) - startAngle,
      );
      rotationRef.current = nextRotation;
      onChange({
        x: display.x,
        y: display.y,
        width: display.width,
        height: display.height,
        rotation: nextRotation,
        zIndex,
      });
    };
    const stopRotate = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopRotate);
      window.removeEventListener("pointercancel", stopRotate);
    };

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", stopRotate, { once: true });
    window.addEventListener("pointercancel", stopRotate, { once: true });
  }

  // Rotation lives on the inner wrapper so the Rnd's axis-aligned rect remains
  // the authoritative bounding box for drag/resize math. A bare mousedown
  // listener (no stopPropagation — that would prevent react-rnd from starting
  // a drag) marks the element as the current selection.
  const rotated = (
    <div
      onMouseDown={() => {
        if (editable) onSelect?.();
      }}
      style={{
        width: "100%",
        height: "100%",
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center center",
      }}
    >
      {children}
    </div>
  );

  // The editor shows the clamped rect, so export and thumbnails must place the
  // element there too — an out-of-bounds saved rect would otherwise export
  // somewhere the user never saw it.
  const display = clampRect(rect, boundsW, boundsH, allowOverflow);

  // Non-editable (export/thumb) path: plain absolute-positioned div, no Rnd.
  if (!editable) {
    return (
      <div
        style={{
          position: "absolute",
          left: display.x,
          top: display.y,
          width: display.width,
          height: display.height,
          zIndex,
        }}
      >
        {rotated}
      </div>
    );
  }

  const controlScale = Math.max(0.05, previewScale);

  return (
    <Rnd
      bounds={allowOverflow ? undefined : "parent"}
      scale={previewScale}
      lockAspectRatio={lockAspectRatio}
      position={{ x: display.x, y: display.y }}
      size={{ width: display.width, height: display.height }}
      onDragStart={() => onSelect?.()}
      onResizeStart={() => onSelect?.()}
      onDragStop={(_e, d) => {
        const next = clampRect(
          { x: d.x, y: d.y, width: display.width, height: display.height },
          boundsW,
          boundsH,
          allowOverflow,
        );
        onChange({ ...next, rotation, zIndex });
      }}
      onResizeStop={(_e, _dir, ref, _delta, position) => {
        const next = clampRect(
          {
            x: position.x,
            y: position.y,
            width: parseFloat(ref.style.width),
            height: parseFloat(ref.style.height),
          },
          boundsW,
          boundsH,
          allowOverflow,
        );
        onChange({ ...next, rotation, zIndex });
      }}
      style={{ zIndex }}
      resizeHandleStyles={handleStyle}
      className={selected ? "rnd-editable rnd-selected" : "rnd-editable"}
    >
      {rotated}
      <button
        type="button"
        className="rnd-rotate-handle"
        style={{
          right: -14 / controlScale,
          top: -14 / controlScale,
          width: 28 / controlScale,
          height: 28 / controlScale,
        }}
        onPointerDown={startRotate}
        title="Rotate"
        aria-label="Rotate element"
      >
        <RotateCw style={{ width: 14 / controlScale, height: 14 / controlScale }} />
      </button>
    </Rnd>
  );
}

function pointerAngle(x: number, y: number, centerX: number, centerY: number) {
  return (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI;
}

function normalizeRotation(degrees: number) {
  let next = degrees;
  while (next > 180) next -= 360;
  while (next < -180) next += 360;
  return Math.round(next);
}

// Subtle resize handles (visible only on hover via globals.css).
const handleSize = 14;
const handleStyle: Record<string, React.CSSProperties> = {
  top: { height: handleSize },
  right: { width: handleSize },
  bottom: { height: handleSize },
  left: { width: handleSize },
  topRight: { width: handleSize, height: handleSize },
  bottomRight: { width: handleSize, height: handleSize },
  bottomLeft: { width: handleSize, height: handleSize },
  topLeft: { width: handleSize, height: handleSize },
};
