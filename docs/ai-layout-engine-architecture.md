# AI-Powered Packaging Layout Engine — Architecture

Status: **design only, no implementation yet**. This document specifies the
architecture for letting AI compose packaging designs (starting with FEFCO
0201) without ever having AI touch pixel coordinates. It builds on top of
the existing `@dtc/packaging-engine` package (dieline generation, print
zones, `placeDesign`/`fitCenter`/`fitStretch`/`cropToFit`) rather than
replacing it.

## 0. Project history

Kept up to date after each shipped feature, at feature granularity (not
one entry per commit). Newest first.

- **`@dtc/layout-engine` package (implementation step 1 of §13)** — domain
  models (`CompositionPlan`, `SemanticPlacement`, `ResolvedLayout`), the
  size/relative/dependency-graph resolvers, and `resolveLayout()` orchestrating
  them against real `@dtc/packaging-engine` geometry - no AI, no Constraint
  Engine yet. `@dtc/packaging-engine/placement` gained `AnchorPoint` (9-point
  grid) and `anchorFit()` alongside the existing center-only `fitCenter`, and
  `DesignElementType` widened to include qr/barcode/image/icon/shape so
  layout-engine's element vocabulary is the same type, not a parallel one.
  23 + 5 new tests. Not wired into the storefront yet - `applyDesign()`
  migrating onto this engine is a deliberately separate next step.
- **AI layout engine architecture (this document)** — design-only spec for
  semantic AI placement decisions → Layout Engine → Constraint Engine →
  Vision Review, built on top of everything below. No implementation yet.
- **Rule-based live design application** — `applyDesign()` in the
  storefront: takes the customer's selected brand elements (logo, color,
  font, slogan) and uses `@dtc/packaging-engine`'s `placeDesign`/
  `fitCenter` to center the logo and place the slogan on every main panel's
  print zone, with the chosen color as background — live, no button click,
  no AI. `DielinePreview` extended to render this (logo `<image>` and
  slogan `<text>` are painted content, so their coordinates are pre-flipped
  by hand rather than living inside the same Y-flip transform as the pure
  geometry lines).
- **Marka Kiti element picker** — every brand asset (logo, alternate
  logos, each color, both fonts, slogan, each set social/website link) is
  its own labeled, clickable row in the designer's Marka Kiti panel;
  clicking toggles it into a removable chip above the AI prompt bar.
  Editing a brand moved to its own pencil-icon button so it doesn't
  conflict with element selection as the row's main click target.
- **Google Fonts integration** — `heading_font`/`body_font` went from
  plain text (only rendered if the typed name happened to be a system
  font) to an `<datalist>`-backed autocomplete over ~150 curated Google
  Font names, plus a `GoogleFontLoader` that injects the real Google Fonts
  CSS `<link>` for whichever font a brand actually has, so it renders
  correctly on the public share page and in the designer.
- **Inline brand create/edit in the designer** — Marka Kiti used to send
  the customer to the Marka Merkezi pages and back for creating or editing
  a brand. `saveBrandInline` (create/update without the redirect) plus a
  `BrandKitPanel` component now do this in place, including logo upload.
- **Size variant renaming to plain mm** — box/pouch size option values and
  variant titles across the catalog went from code-prefixed, cm-based text
  ("K105 (45 cm x 35 cm x 25 cm)", "L (45x55 cm)") to plain
  "LxWxH"/"WxH" in millimeters ("450x350x250", "450x550"), renamed via the
  admin's per-value-ID endpoint so existing variant associations weren't
  touched. Left "Baskılı Hediye Kutusu" (no numbers to convert) and
  "Baskılı Koli Bandı" (a different parameter - tape roll width, already
  in mm) alone.
- **Real FEFCO 0201 geometry in the designer** — "Baskılı Koli" tagged
  `fefco-0201`; the designer canvas renders the actual generated dieline
  (cut lines, crease lines, print zones) instead of a product photo when
  the active product carries that tag, using dimensions parsed from the
  variant title or the entered custom size.
- **`@dtc/packaging-engine` package** — new pure-TypeScript monorepo
  package (`packages/packaging-engine`) for packaging geometry: FEFCO 0201
  (RSC box) dieline generation (4 panels, inner/outer flaps sized off
  board width, a thickness-scaled glue tab, 5mm-inset print zones per main
  panel), a `placement` module (`placeDesign` + `fitCenter`/`fitStretch`/
  `cropToFit` strategies, product-family-agnostic), and DXF export via
  `@tarikjabiri/dxf` (Taglio/Cordone layers). Split into subpath exports
  (`./box-styles`, `./shared`, `./placement`, `./export`) so the storefront
  only ever bundles what it needs client-side.
- **Custom size inputs with real constraints** — the designer's
  Konfigürasyon panel supports "Özel ölçü" alongside standard variants:
  Boy/En/Yükseklik in cm, min/max per product (from metadata, generic
  5–100cm fallback), enforcing Boy ≥ En and Boy+En / En+Yükseklik ≥ 27cm
  (real die-cutting/corrugator limits). Since there's no real formula or
  variant for an arbitrary size yet, submitting adds the base variant to
  the cart with the requested dimensions as line item metadata and swaps
  "Sepete Ekle" for "Teklif İste" - pricing still needs manual follow-up.
- **Tasarla design studio** — `/tasarla` moved into its own route group
  (fixed full-screen shell, no site header/footer/scroll): top bar (logo,
  product summary, price, cart/quote action), left icon rail (Ürün,
  Konfigürasyon, Marka Kiti, Tema, Yazı, Elementler), a category-filterable
  picker over every Custom-tagged product, and a bottom AI prompt bar.
  Auto-advances to the next logical step once (Ürün → Konfigürasyon → Marka
  Kiti) depending on what's already known when it opens.
- **Custom-tagged products skip the cart, go straight to Tasarla** —
  products tagged "Custom" in the admin show a "Tasarla" button instead of
  (or combined with, in earlier iterations) "Sepete Ekle"; the selected
  variant/quantity are carried via query params, and the cart is only
  touched once a design is actually finished.
- **Storefront cleanup pass** — mini cart dropdown and full `/cart` page
  localized from the untouched English starter template to Turkish and
  the site's black/10 visual language; fixed a missing product thumbnail
  (the cart's fields query never requested `*items.product.images`, and
  the code read from the wrong, always-empty `variant.product.images`
  path instead); fixed cart line-item table overflow on mobile (<1024px,
  this project's "small" breakpoint). Removed Tasarla/Keşfet/İşini Büyüt
  from the nav (not being worked on for now, routes left in place) and
  deleted three leftover demo-seed categories (Pants, Sweatshirts, Merch -
  zero products, unrelated to a packaging catalog).
- **Faturalandırma Merkezi (Billing Center)** — a page for viewing/editing
  the single address marked as the customer's default billing address
  (company/invoice name + address), separate from the general address book.
- **Marka Merkezi (Brand Center)** — the first feature of this arc: a new
  `brand` Medusa module and store API, letting a customer create one or
  more brand profiles (logo + alternate logos, colors, fonts, social
  links, slogan) and share a read-only public view of each. Started as
  modal-based add/edit (mirroring the existing address book pattern), then
  moved to dedicated `/marka-merkezi/yeni` and `/marka-merkezi/[brandId]`
  pages once modals felt inconsistent with the rest of the flow.
- **Account section tidy-up** (earlier in this arc, predates the above) —
  login/register/overview/profile/addresses/orders pages brought in line
  with the site's Base Web-inspired black/10 visual language; fixed a
  profile page input bug.

## 1. Guiding principle

**AI decides WHAT goes WHERE, in semantic terms. It never outputs x/y
coordinates.** A deterministic Layout Engine converts semantic decisions
into geometry. A Constraint Engine validates the geometry against real
printing constraints. A Vision Review Pipeline is a final, soft QA pass.

```
Prompt + selected brand elements
        │
        ▼
  AI Service  ──────────────►  CompositionPlan (semantic, panel/anchor/size)
        │                              │
        │                              ▼
        │                       Layout Engine  ────►  ResolvedLayout (real mm coordinates)
        │                              │
        │                              ▼
        │                    Constraint Engine  ────►  ConstraintReport (violations)
        │                              │
        │              ┌───────────────┴───────────────┐
        │              │ violations found               │ valid
        │              ▼                                 ▼
        │      repair (nudge) or re-prompt AI      Render (SVG/PNG)
        │              │                                 │
        └──────────────┘                                 ▼
                                                  Vision Review Pipeline
                                                   (soft pass/needs-revision)
```

This mirrors and generalizes the rule-based `applyDesign()` already shipped
in the storefront designer today. That function is, in effect, a single
hardcoded `CompositionPlan` ("logo → front → center → large", "slogan →
below logo") run through a simplified layout step. Once the real Layout
Engine exists, `applyDesign()` becomes a trivial default `CompositionPlan`
fed through the same pipeline — the instant, no-AI live preview and the
AI-composed design end up sharing one code path.

## 2. Bounded contexts (DDD)

| Context | Owns | Package |
|---|---|---|
| **Geometry** | Dielines, panels, print zones, low-level placement math | `@dtc/packaging-engine` (existing) |
| **Composition** | Semantic placement decisions (what AI produces/consumes) | `@dtc/layout-engine` (new) |
| **Layout** | Resolving semantic decisions into real coordinates | `@dtc/layout-engine` (new) |
| **Validation** | Constraint rules, violation reporting, repair | `@dtc/layout-engine` (new) |
| **AI Orchestration** | Prompting, provider abstraction, retry/repair loop, vision review | `@dtc/ai-composer` (new) |
| **Presentation** | Rendering `ResolvedLayout` to SVG for the storefront canvas | `apps/storefront` (existing `DielinePreview`, extended) |

Geometry stays exactly as it is — nothing here requires changing
`@dtc/packaging-engine`'s existing box-styles/placement/export modules,
only *adding* to `placement`.

## 3. Project structure

```
packages/
  packaging-engine/                 (existing, unchanged)

  layout-engine/                    (NEW)
    src/
      domain/
        semantic-placement.ts       # SemanticPlacement, CompositionPlan
        resolved-layout.ts          # ResolvedElement, ResolvedLayout
        panel-semantics.ts          # SemanticPanelName, PanelSemanticsMap
      resolvers/
        anchor-resolver.ts          # 9-point anchor -> box position
        relative-resolver.ts        # "below logo" etc -> box position
        size-resolver.ts            # SizeHint -> concrete Dimensions
        dependency-graph.ts         # topological sort for relativeTo chains
        layout-resolver.ts          # orchestrates the above into ResolvedLayout
      constraints/
        rules/
          no-fold-line-overlap.ts
          no-glue-flap-overlap.ts
          minimum-margin.ts
          no-element-overlap.ts
          barcode-printable.ts
          qr-scannable.ts
          visual-hierarchy.ts       # warning-level, not blocking
        rule-engine.ts              # generic rule registry + runner
        constraint-engine.ts        # domain-specific: builds rule set, runs, reports
        repair.ts                   # nudge/shrink auto-repair
      plugins/
        box-type-registry.ts
        element-type-registry.ts
        box-types/
          fefco-0201.plugin.ts      # panelSemantics mapping onto packaging-engine's panel names
        element-types/
          logo.plugin.ts
          text.plugin.ts
          qr.plugin.ts
          barcode.plugin.ts
          image.plugin.ts
          icon.plugin.ts
          shape.plugin.ts
      i18n/
        messages.ts                 # message-key catalog, not hardcoded strings
      schema/
        composition-plan.schema.ts  # zod schema (source of truth) + generated JSON Schema
      index.ts

  ai-composer/                      (NEW)
    src/
      domain/
        compose-request.ts
        review-result.ts
      providers/
        llm-provider.ts             # interface
        openai-provider.ts
        anthropic-provider.ts
      prompts/
        compose-prompt.ts
        repair-prompt.ts            # includes prior violations
        vision-review-prompt.ts
      pipeline/
        compose-design.use-case.ts  # the full retry/repair/vision loop
        render-preview.ts           # SVG -> PNG for vision review
      index.ts

apps/
  backend/
    src/
      api/store/brands/[id]/... (existing)
      api/store/designs/[id]/compose/route.ts   (NEW - wraps ai-composer)
      modules/design/                            (NEW - persists CompositionPlan/ResolvedLayout per design, like `brand` module)
  storefront/
    src/modules/designer/
      utils/apply-design.ts        # becomes a default CompositionPlan + call into layout-engine
      components/dieline-preview/  # extended to render ResolvedElement[] generically (already renders logo+text ad hoc; generalize to element-type plugins' render())
```

**Why AI orchestration lives in the backend, not the storefront:** it needs
a server-held API key, benefits from request queuing/caching, and its
retry loop can be a Medusa workflow (this stack already uses
`@medusajs/workflows-sdk` elsewhere) rather than a client-side long-lived
fetch.

**Why Layout Engine + Constraint Engine are a separate package, not
backend-only:** they're pure, fast, deterministic functions with no I/O —
exactly like `packaging-engine`. Running them in the storefront gives
instant preview (today's `applyDesign()` already does this); running the
*same* code in the backend during AI composition guarantees the AI's
output is validated with the identical logic the user sees live. One
implementation, two call sites.

## 4. Domain models

```typescript
// ---- Composition (what AI produces) ----

type SemanticPanelName = "front" | "back" | "left" | "right" | "top" | "bottom"
// Physical mapping (e.g. "front" -> "Panel-L1") lives in each BoxTypePlugin,
// not in these types - composition stays box-style-agnostic.

type ElementType = "logo" | "text" | "qr" | "barcode" | "image" | "icon" | "shape"

type AnchorPoint =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right"

type RelativePosition = "above" | "below" | "left-of" | "right-of" | "inside"

type SizeHint = "small" | "medium" | "large" | "full-width" | "full-height"

interface SemanticElementBase {
  elementId: string
  elementType: ElementType
  /** Free-form payload the element-type plugin knows how to render
   *  (image URL, text string + font ref, QR target URL, barcode value...).
   *  Layout/Constraint engines never inspect this. */
  content: Record<string, unknown>
}

interface AbsolutePlacement extends SemanticElementBase {
  placementKind: "absolute"
  panel: SemanticPanelName
  anchor: AnchorPoint
  size?: SizeHint
  marginHint?: "tight" | "normal" | "loose"
}

interface RelativePlacement extends SemanticElementBase {
  placementKind: "relative"
  panel: SemanticPanelName
  relativeTo: string // another element's elementId
  position: RelativePosition
  gapHint?: "tight" | "normal" | "loose"
  size?: SizeHint
}

type SemanticPlacement = AbsolutePlacement | RelativePlacement

interface CompositionPlan {
  version: "1.0"
  boxType: string // registry key, e.g. "fefco-0201"
  elements: SemanticPlacement[]
  metadata?: {
    promptUsed?: string
    aiModel?: string
    generatedAt: string
  }
}

// ---- Layout (what the Layout Engine produces) ----

interface ResolvedElement {
  elementId: string
  elementType: ElementType
  panelName: string // physical panel name, e.g. "Panel-L1"
  position: { x: number; y: number } // mm, panel-local, matches packaging-engine's Point
  size: { w: number; h: number }
  rotationDeg?: number
  zIndex: number
  content: Record<string, unknown>
}

interface ResolvedLayout {
  boxType: string
  compositionPlanVersion: string
  panels: {
    panelName: string
    elements: ResolvedElement[]
  }[]
}

// ---- Validation ----

interface ConstraintViolation {
  elementId: string
  ruleId: string
  severity: "error" | "warning"
  messageKey: string // i18n key, e.g. "constraint.overlapsFoldLine"
  messageParams?: Record<string, string | number>
  suggestedFix?: Partial<ResolvedElement>
}

interface ConstraintReport {
  valid: boolean // no `error`-severity violations
  violations: ConstraintViolation[]
}

interface ConstraintRule {
  id: string
  appliesTo?: ElementType[] // omit = applies to all
  check(
    element: ResolvedElement,
    layout: ResolvedLayout,
    geometry: PanelGeometry[] // from @dtc/packaging-engine
  ): ConstraintViolation[]
}

// ---- Plugins ----

interface BoxTypePlugin<Params = unknown> {
  key: string // "fefco-0201"
  generateGeometry(params: Params): PanelGeometry[] // delegates to packaging-engine
  panelSemantics: Record<SemanticPanelName, string> // "front" -> "Panel-L1"
  sizeBuckets?: Partial<Record<SizeHint, number>> // fraction of zone's min-dimension; has sane defaults
}

interface ElementTypePlugin {
  type: ElementType
  /** If the content has a knowable intrinsic size (e.g. an uploaded image's
   *  real pixel dimensions were stored) return it; otherwise null and the
   *  size resolver falls back to the SizeHint bucket only. */
  computeNaturalSize?(content: Record<string, unknown>): { w: number; h: number } | null
  render(element: ResolvedElement): SvgFragment // returns a serializable SVG node description
  constraintRules?: ConstraintRule[]
  defaultZIndex: number
}
```

## 5. Layout Engine — algorithm

Input: `CompositionPlan` + `PanelGeometry[]` (already generated by
`@dtc/packaging-engine`'s box-style plugin, e.g. `generateFefco0201`).

1. **Map semantic panels to physical panels** via the active
   `BoxTypePlugin.panelSemantics`. Reject/flag any element referencing a
   panel that doesn't exist for this box type.
2. **Split elements into absolute vs. relative**, and build a dependency
   graph from `relativeTo` references among relative elements.
3. **Topologically sort** (Kahn's algorithm) the relative elements. A
   cycle (A relative to B, B relative to A) is a hard error — reject the
   plan before resolving anything, with a clear violation identifying the
   cycle.
4. **Resolve absolute elements first**, in plan order:
   - Look up the panel's `PrintZone` (from `packaging-engine`).
   - Resolve `SizeHint` → concrete `{w, h}` via the box type's
     `sizeBuckets` (or the element-type plugin's `computeNaturalSize`, if
     the content has one — e.g. a real logo file's own aspect ratio should
     win over a generic size bucket).
   - Resolve `anchor` (9-point grid) to a position within the zone —
     this generalizes today's `fitCenter` (which only implements the
     `center` anchor) into all nine positions, still expressed as a
     `PlacementStrategy` from `@dtc/packaging-engine/placement`, so the new
     anchor resolver *extends* that module rather than duplicating it.
5. **Resolve relative elements** in topological order: find the already-
   resolved reference element's box, then place adjacent to it per
   `position` (above/below/left-of/right-of) or centered inside it
   (`inside`), offset by `gapHint`.
6. **Assign z-index** from each `ElementTypePlugin.defaultZIndex`
   (background shapes lowest, logo/text mid, QR/barcode always on top so
   nothing can visually clip a scannable code), with per-element manual
   overrides allowed later if needed.
7. Return `ResolvedLayout`.

This step never fails on "impossible" input by throwing — geometry
resolution always produces *some* layout (even a bad one); it's the
Constraint Engine's job to catch problems.

## 6. Constraint Engine + Rule Engine

**Rule Engine** is the generic, reusable execution mechanism:

```typescript
class RuleRegistry {
  register(rule: ConstraintRule): void
  runAll(layout: ResolvedLayout, geometry: PanelGeometry[]): ConstraintReport
}
```

**Constraint Engine** is the domain-specific configuration on top of it —
which rules are active, in what order, with what severity — and owns the
repair loop.

Built-in rules for v1:

| Rule | Severity | Checks |
|---|---|---|
| `no-fold-line-overlap` | error | Element bounding box doesn't cross any `creaseLines` |
| `no-glue-flap-overlap` | error | Element isn't placed on the `GlueTab` panel (or any panel with an empty `printZones`) |
| `minimum-margin` | error | Element stays within the zone's `safeInsets` |
| `no-element-overlap` | error | Pairwise AABB intersection test between all elements on the same panel |
| `barcode-printable` | error | Barcode element meets a minimum width/height + quiet-zone margin (standard symbology minimums) |
| `qr-scannable` | error | QR element meets a minimum module size for the target print DPI and isn't rotated |
| `visual-hierarchy` | warning | Logo isn't smaller than body text; brand elements aren't dominated by decorative ones |

**Repair loop** (`constraints/repair.ts`): for `error`-severity violations
with a `suggestedFix`, try a bounded local search — nudge position/shrink
size in small increments, re-run just the affected rules, accept the first
fix that clears the violation without introducing a new one, up to N
iterations. If unrepairable, escalate to the AI Service with the
violation list attached to the next prompt (see §7) rather than silently
failing.

## 7. AI Service (`@dtc/ai-composer`)

```typescript
interface LlmProvider {
  generateComposition(input: ComposeInput): Promise<CompositionPlan>
}

interface ComposeInput {
  prompt: string
  locale: string
  boxType: string
  availablePanels: SemanticPanelName[]
  selectedElements: { elementId: string; elementType: ElementType; content: Record<string, unknown> }[]
  priorAttempt?: { plan: CompositionPlan; violations: ConstraintViolation[] } // present on retries
}
```

Providers (`OpenAiProvider`, `AnthropicProvider`, ...) use each vendor's
structured-output / tool-use mode constrained to the `CompositionPlan` JSON
Schema (§9) — never free-text JSON parsing.

**`ComposeDesignUseCase` pipeline:**

1. Build the prompt from `ComposeInput` (box context, panel list, selected
   brand elements, user's free text, locale).
2. Call `LlmProvider.generateComposition()`.
3. Validate the result against the `CompositionPlan` zod schema. A schema
   validation failure is treated the same as a constraint violation and
   retried (bounded, e.g. 3 attempts) — never trust raw LLM JSON.
4. Run the Layout Engine → `ResolvedLayout`.
5. Run the Constraint Engine → `ConstraintReport`.
6. If invalid: attempt the repair loop (§6) first (cheap, no AI round
   trip); if still invalid, re-prompt the LLM with the violation list
   attached (`priorAttempt`), up to the retry budget. If still invalid
   after the budget, surface the *last* repaired-as-much-as-possible
   layout with the remaining warnings visible to the user rather than
   blocking them entirely.
7. Render the accepted layout to SVG/PNG.
8. Hand off to the Vision Review Pipeline (§8), async — this does not
   block returning the design to the user.

## 8. Vision Review Pipeline

A **soft**, asynchronous quality gate — never a hard blocker, since vision
models can be wrong and this must not add latency to the main flow.

1. Render `ResolvedLayout` to a flattened PNG (server-side, e.g. via
   `resvg`/`sharp` from the SVG the storefront would otherwise draw).
2. Send the PNG + a review prompt to a vision-capable model: overall
   aesthetic score, specific flagged issues (missed overlaps, poor
   contrast, illegible text, off-brand color clash), pass/needs-revision
   verdict.
3. On `needs-revision`: feed the vision model's specific feedback back into
   `ComposeDesignUseCase` for one bounded extra attempt.
4. Persist the verdict either way; surface a "reviewed" vs. "needs a human
   look" badge in the storefront rather than silently accepting or
   rejecting.

## 9. JSON Schema (CompositionPlan)

Zod is the source of truth (`schema/composition-plan.schema.ts`); this is
its JSON Schema equivalent, used to constrain LLM structured output:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CompositionPlan",
  "type": "object",
  "required": ["version", "boxType", "elements"],
  "properties": {
    "version": { "const": "1.0" },
    "boxType": { "type": "string" },
    "elements": {
      "type": "array",
      "items": { "$ref": "#/$defs/SemanticPlacement" }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "promptUsed": { "type": "string" },
        "aiModel": { "type": "string" },
        "generatedAt": { "type": "string", "format": "date-time" }
      }
    }
  },
  "$defs": {
    "ElementType": {
      "enum": ["logo", "text", "qr", "barcode", "image", "icon", "shape"]
    },
    "SemanticPanelName": {
      "enum": ["front", "back", "left", "right", "top", "bottom"]
    },
    "AnchorPoint": {
      "enum": [
        "top-left", "top-center", "top-right",
        "center-left", "center", "center-right",
        "bottom-left", "bottom-center", "bottom-right"
      ]
    },
    "SizeHint": {
      "enum": ["small", "medium", "large", "full-width", "full-height"]
    },
    "SemanticPlacement": {
      "oneOf": [
        {
          "type": "object",
          "required": ["elementId", "elementType", "content", "placementKind", "panel", "anchor"],
          "properties": {
            "elementId": { "type": "string" },
            "elementType": { "$ref": "#/$defs/ElementType" },
            "content": { "type": "object" },
            "placementKind": { "const": "absolute" },
            "panel": { "$ref": "#/$defs/SemanticPanelName" },
            "anchor": { "$ref": "#/$defs/AnchorPoint" },
            "size": { "$ref": "#/$defs/SizeHint" },
            "marginHint": { "enum": ["tight", "normal", "loose"] }
          }
        },
        {
          "type": "object",
          "required": ["elementId", "elementType", "content", "placementKind", "panel", "relativeTo", "position"],
          "properties": {
            "elementId": { "type": "string" },
            "elementType": { "$ref": "#/$defs/ElementType" },
            "content": { "type": "object" },
            "placementKind": { "const": "relative" },
            "panel": { "$ref": "#/$defs/SemanticPanelName" },
            "relativeTo": { "type": "string" },
            "position": { "enum": ["above", "below", "left-of", "right-of", "inside"] },
            "gapHint": { "enum": ["tight", "normal", "loose"] },
            "size": { "$ref": "#/$defs/SizeHint" }
          }
        }
      ]
    }
  }
}
```

## 10. Extensibility

**New FEFCO box types** (e.g. FEFCO 0203, 0427): add a `BoxTypePlugin`
implementing `generateGeometry` (a new function in
`@dtc/packaging-engine/box-styles`, same pattern as
`generateFefco0201`) and a `panelSemantics` map. Nothing in the
Composition/Layout/Constraint/AI layers changes.

**New element types** (beyond logo/text/qr/barcode/image/icon/shape): add
an `ElementTypePlugin` with `render()` and optional `constraintRules`.
The AI prompt's allowed `elementType` enum and the JSON Schema both need
the new value added, but the Layout/Constraint engines are generic over
`ElementTypePlugin` and need no changes.

**New product families** (labels, mailers, stand-up pouches, tapes): a
label is a `PanelGeometry` with exactly one panel and no flaps — already
representable by the existing type without modification. A pouch or
mailer is a new `BoxTypePlugin`-equivalent (or a `PouchTypePlugin`, if its
parameter shape genuinely differs, per `@dtc/packaging-engine/pouch-styles`,
which currently only has the parameter type, no generator yet). The
Composition/Layout/Constraint/AI layers are unaware of the physical
product family at all — they only see `PanelGeometry[]` and
`panelSemantics`, so this extension point is already fully open.

## 11. Multi-language support

- All `ConstraintViolation.messageKey` values resolve through an i18n
  message catalog (`layout-engine/i18n/messages.ts`) — never a hardcoded
  string — mirroring this project's existing Turkish-first convention.
- AI **prompts** are parameterized by `locale`, but semantic placement
  decisions (panel/anchor/size) are language-agnostic by construction —
  the AI never needs to "understand" the target language to decide *where*
  a logo goes, only when reasoning about a Turkish-language user prompt or
  producing user-visible text content (e.g. suggesting slogan wording,
  which is a separate, later concern from layout).
- Font selection already exists (`GoogleFontInput`/`GoogleFontLoader`);
  extended-Latin scripts (Turkish included) are covered by nearly all
  Google Fonts, so no special handling is anticipated here.

## 12. Scalability / production notes

- Layout + Constraint resolution is pure, synchronous, and fast — no
  network I/O. It can run in the storefront (instant preview, exactly like
  today's `applyDesign()`) *and* in the backend during AI composition,
  from the same package, so the validation the user sees live and the
  validation the AI's output goes through are never out of sync.
- AI composition and vision review are the only latency/cost-bearing
  steps. Run them as a Medusa workflow (this stack already has
  `@medusajs/workflows-sdk` wired in elsewhere) so they're queued,
  retryable, and don't block the HTTP request/response cycle.
- Cache resolved layouts keyed by a hash of `CompositionPlan` — resolution
  is deterministic, so a repeated plan (common when a customer reopens a
  design) never needs recomputing.
- Every AI provider boundary validates output against the zod schema
  before it touches the Layout Engine — a malformed or hallucinated field
  is a validation failure to retry, never a runtime crash.
- New `design` module in the backend (mirroring the existing `brand`
  module's shape) persists `CompositionPlan` + `ResolvedLayout` +
  `ConstraintReport` + vision-review verdict per design, so a design is
  fully reproducible and auditable without re-calling the AI.

## 13. What ships in what order (for when we move to implementation)

This document is architecture-only per your request, but for sequencing
reference once approved:

1. `@dtc/layout-engine`: domain models + anchor/relative resolvers +
   dependency graph (no AI yet) — this alone lets `applyDesign()` be
   rewritten as a plain hardcoded `CompositionPlan` through the real
   engine, unifying the two code paths immediately.
2. Constraint Engine + built-in rules + repair loop.
3. `@dtc/ai-composer` with one `LlmProvider` (start with one vendor),
   compose pipeline, retry-with-feedback.
4. Vision Review Pipeline (async, soft gate).
5. Plugin system generalization (only needed once a second box type or
   element type actually shows up — YAGNI until then, but the interfaces
   above are already shaped for it).
