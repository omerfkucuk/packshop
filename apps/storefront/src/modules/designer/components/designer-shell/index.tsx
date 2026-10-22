"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { isEqual } from "lodash"
import { HttpTypes } from "@medusajs/types"
// Imported from the box-styles subpath specifically (not the package root)
// so client bundles never pull in export/dxf.ts's @tarikjabiri/dxf
// dependency, which is only ever needed server-side.
import { generateFefco0201 } from "@dtc/packaging-engine/box-styles"
import type { Dimensions } from "@dtc/packaging-engine/shared"
// Subpath import, not the package root - the root barrel also re-exports
// ./providers (including OpenAiProvider, which pulls in the `openai` SDK).
// This is a "use client" component, so a root import would bundle that
// server-only dependency into the browser. listThemes/ThemeId live in
// ./domain, which has no dependency on providers.
import { listThemes, THEMES, type ThemeId } from "@dtc/ai-composer/domain"
import { applyManualOverrides, type ManualOverrides } from "@dtc/layout-engine"

import { Brand } from "@lib/data/brands"
import { addToCart } from "@lib/data/cart"
import { saveDesignDraft, type DesignDraft } from "@lib/data/designs"
import { getProductPrice } from "@lib/util/get-product-price"
import { getCustomSizeRanges } from "@lib/util/custom-size"
import { getGeometryType } from "@lib/util/product"
import { parseDimensionsFromVariantTitle } from "@lib/util/parse-variant-dimensions"
import { optionsAsKeymap } from "@modules/products/components/product-actions"
import { Button } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import DielinePreview, { MIN_TEXT_SIZE } from "../dieline-preview"
// Client-only, ssr:false - three.js needs a real browser (WebGL) and the
// bundle is only worth downloading once the customer actually switches to
// the 3D view, not on every Tasarla page load.
const BoxPreview3D = dynamic(() => import("../box-preview-3d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full w-full text-sm text-black/50">
      3D önizleme yükleniyor…
    </div>
  ),
})
import { applyDesign, type ResolveDesignResult } from "../../utils/apply-design"
import { applyTheme } from "../../utils/apply-theme"
import { generateAiDesign } from "../../utils/compose-design"
import BrandKitPanel from "../brand-kit-panel"
import ElementLibraryPanel from "../element-library-panel"
import TextPanel from "../text-panel"
import { getLibraryElement } from "../../utils/element-library"
import { measureText, fontSizeForInkHeight } from "../../utils/measure-text"
import { SelectedElement } from "../../types"

type Tool = "urun" | "komponent" | "marka-kiti" | "tema" | "ai"

// Die-cutting/corrugator constraints for custom sizes: Boy (length) and En
// (width) together, and En and Yükseklik (height) together, each need at
// least 27cm combined, and Boy must never be shorter than En.
const MIN_PAIR_SUM_CM = 27

// Display-only Turkish label for the physical panel a 3D face click
// resolves to (see BoxMesh's onFaceClick) - shown in the "which face am I
// looking at" pill above the focused 2D view. Mirrors
// FEFCO_0201_PANEL_SEMANTICS's mapping in reverse; kept as its own small
// map here rather than inverting that one at runtime since it only exists
// for this one label, not any real geometry/layout decision.
const PANEL_DISPLAY_NAME: Record<string, string> = {
  "Panel-L1": "Ön",
  "Panel-W1": "Sağ",
  "Panel-L2": "Arka",
  "Panel-W2": "Sol",
}


// The design flow as five sequential steps. Configuration ends by adding
// the item to the cart ("Sepete ekle ve tasarla"); the last step holds the
// AI prompt plus text/element tools and leads on to the cart.
const STEPS: { id: Tool; label: string }[] = [
  { id: "urun", label: "Ürün" },
  { id: "komponent", label: "Konfigürasyon" },
  { id: "marka-kiti", label: "Marka Kiti" },
  { id: "tema", label: "Tema" },
  { id: "ai", label: "AI ile düzelt" },
]

type DesignerShellProps = {
  product: HttpTypes.StoreProduct | null
  region: HttpTypes.StoreRegion
  countryCode: string
  initialVariantId?: string
  initialQuantity: number
  brands: Brand[]
  products: HttpTypes.StoreProduct[]
  categories: HttpTypes.StoreProductCategory[]
  /** The customer's auto-saved canvas state for this exact product, if
   *  they've ever edited one before - null for a fresh product, or when
   *  nobody's logged in (see page.tsx's `customer && product` guard). */
  initialDesignDraft: DesignDraft | null
}

const DesignerShell = ({
  product,
  region,
  countryCode,
  initialVariantId,
  initialQuantity,
  brands,
  products,
  categories,
  initialDesignDraft,
}: DesignerShellProps) => {
  const router = useRouter()

  const initialVariant = product?.variants?.find((v) => v.id === initialVariantId)

  // No product yet -> step 1; otherwise step 2 (a variant passed in, e.g.
  // from the homepage configurator, is just preselected there - the item
  // still gets added to the cart by finishing that step).
  const [activeTool, setActiveTool] = useState<Tool>(product ? "komponent" : "urun")
  // Furthest step unlocked; steps can be revisited but not skipped ahead.
  const [maxStep, setMaxStep] = useState(product ? 1 : 0)
  const stepIndex = Math.max(0, STEPS.findIndex((st) => st.id === activeTool))
  const goToStep = (index: number) => {
    if (index > maxStep) return
    setActiveTool(STEPS[index].id)
  }
  const advance = () => {
    const next = Math.min(stepIndex + 1, STEPS.length - 1)
    setMaxStep((m) => Math.max(m, next))
    setActiveTool(STEPS[next].id)
  }
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  // 3D is a read-only preview (orbit/rotate only) - all editing stays on
  // the 2D dieline regardless of which view is currently showing. Clicking
  // a printed face while in 3D (see onFaceClick below) jumps INTO that 2D
  // editor already zoomed to just the clicked face, via focusedPanelName.
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d")
  // Which physical panel (if any) the 2D dieline is zoomed to - set by
  // clicking a face in 3D, cleared by either 2D/3D toggle button (both are
  // "show me everything" actions). null shows the full flat dieline, same
  // as before this existed.
  const [focusedPanelName, setFocusedPanelName] = useState<string | null>(null)
  const [options, setOptions] = useState<Record<string, string | undefined>>(
    () => optionsAsKeymap(initialVariant?.options ?? null) ?? {}
  )
  const [quantity, setQuantity] = useState(initialQuantity)
  const [isAdding, setIsAdding] = useState(false)
  const sizeRanges = product ? getCustomSizeRanges(product) : null
  const [useCustomSize, setUseCustomSize] = useState(false)
  const [customWidth, setCustomWidth] = useState(sizeRanges?.width.min ?? 5)
  const [customHeight, setCustomHeight] = useState(sizeRanges?.height.min ?? 5)
  const [customDepth, setCustomDepth] = useState(sizeRanges?.depth.min ?? 5)
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(
    initialDesignDraft?.brand_id ?? brands[0]?.id ?? null
  )
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [isGeneratingAiDesign, setIsGeneratingAiDesign] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<ThemeId | null>(
    initialDesignDraft?.selected_theme ?? null
  )
  // Once set, this takes over the canvas from the live rule-based default
  // (applyDesign) - cleared any time the inputs it was generated from
  // change, so the customer never sees a stale AI result silently applied
  // to a different selection.
  const [aiDesign, setAiDesign] = useState<ResolveDesignResult | null>(null)
  const [selectedElements, setSelectedElements] = useState<SelectedElement[]>(
    initialDesignDraft?.selected_elements ?? []
  )
  const selectedElementIds = new Set(selectedElements.map((el) => el.id))
  // Elements the customer has dragged to a new spot on the canvas. Not
  // reset in toggleElement/removeElement/handleSelectTheme like aiDesign -
  // element IDs here are deterministic (e.g. "logo-front"), so an override
  // naturally keeps applying across unrelated edits and naturally drops
  // out (see the `currentIds` filter below) the moment its element
  // genuinely stops existing in the newly-derived base design.
  const [manualOverrides, setManualOverrides] = useState<ManualOverrides>(
    initialDesignDraft?.manual_overrides ?? {}
  )

  const toggleElement = (element: SelectedElement) => {
    setAiDesign(null)
    if (
      element.type === "logo" ||
      element.type === "library-element" ||
      element.type === "custom-text"
    ) {
      // Both are individually placeable instances on the canvas, not a
      // single on/off toggle - each click on the row adds one more (placed
      // on the front panel by default, dragged wherever from there);
      // removing one happens via its own chip's "x" in the AI bar below,
      // same as every other selected element.
      setSelectedElements((prev) => [
        ...prev,
        { ...element, id: `${element.id}-${crypto.randomUUID()}` },
      ])
      return
    }
    setSelectedElements((prev) =>
      prev.some((el) => el.id === element.id)
        ? prev.filter((el) => el.id !== element.id)
        : [...prev, element]
    )
  }

  const removeElement = (id: string) => {
    setAiDesign(null)
    setSelectedElements((prev) => prev.filter((el) => el.id !== id))
  }

  // Only meaningful for an individually-placed element (logo/library-
  // element/custom-text) - those are the only SelectedElement types whose
  // id equals its own ResolvedElement.elementId 1:1 (see buildCompositionPlan
  // in apply-design.ts), so they're the only ones a lookup by elementId can
  // ever find here. A no-op for anything else (a repeated brand slogan
  // instance, an AI-composed element) is the right fallback - there's no
  // single logical "the source" to clone for those, same reasoning as the
  // on-canvas delete button's own sourceElementId fallback.
  const duplicateElement = (
    elementId: string,
    position: { x: number; y: number },
    panelName: string,
    secondaryPanelName: string | undefined
  ) => {
    const original = selectedElements.find((el) => el.id === elementId)
    if (!original) return

    setAiDesign(null)
    const duplicate = { ...original, id: `${original.id}-${crypto.randomUUID()}` }
    setSelectedElements((prev) => [...prev, duplicate])
    patchManualOverride(duplicate.id, { ...position, panelName, secondaryPanelName })
  }

  const handleSelectTheme = (theme: ThemeId) => {
    setAiDesign(null)
    setSelectedTheme((prev) => (prev === theme ? null : theme))
  }

  const selectedVariant = useMemo(() => {
    return product?.variants?.find((v) =>
      isEqual(optionsAsKeymap(v.options), options)
    )
  }, [product, options])


  const selectedBrand = brands.find((b) => b.id === selectedBrandId) ?? null

  // Real uploaded logos rarely have a square pixel aspect ratio (a wordmark
  // is wide and short) - without their real dimensions, applyDesign/
  // applyTheme fall back to a forced-square size bucket, and the logo gets
  // letterboxed inside it (own aspect ratio kept, but with visible empty
  // space on two sides - looks like a padded/stretched frame around the
  // artwork). Probed once per URL via a plain <img> load (resolveLayout()
  // itself must stay synchronous) and cached here, keyed by URL so a brand
  // reused across multiple selections/themes only loads once.
  const [imageNaturalSizes, setImageNaturalSizes] = useState<Record<string, Dimensions>>({})
  useEffect(() => {
    const urls = new Set<string>()
    for (const el of selectedElements) {
      if (el.type === "logo" && el.value) urls.add(el.value)
    }
    if (selectedBrand?.logo_url) urls.add(selectedBrand.logo_url)

    const missing = Array.from(urls).filter((url) => !(url in imageNaturalSizes))
    if (missing.length === 0) return

    let cancelled = false
    missing.forEach((url) => {
      const img = new Image()
      img.onload = () => {
        if (cancelled) return
        setImageNaturalSizes((prev) =>
          url in prev ? prev : { ...prev, [url]: { w: img.naturalWidth, h: img.naturalHeight } }
        )
      }
      img.src = url
    })
    return () => {
      cancelled = true
    }
  }, [selectedElements, selectedBrand, imageNaturalSizes])

  const price = product
    ? getProductPrice({ product, variantId: selectedVariant?.id })
    : null
  const displayPrice = price?.variantPrice || price?.cheapestPrice

  const image = product?.images?.[0]?.url ?? product?.thumbnail

  const geometryType = product ? getGeometryType(product) : null

  const customSizeErrors: string[] = []
  if (useCustomSize) {
    if (customHeight < customWidth) {
      customSizeErrors.push("Boy, En'den küçük olamaz.")
    }
    if (customHeight + customWidth < MIN_PAIR_SUM_CM) {
      customSizeErrors.push(`Boy + En toplamı en az ${MIN_PAIR_SUM_CM} cm olmalı.`)
    }
    if (customWidth + customDepth < MIN_PAIR_SUM_CM) {
      customSizeErrors.push(`En + Yükseklik toplamı en az ${MIN_PAIR_SUM_CM} cm olmalı.`)
    }
  }

  // Custom size inputs are in cm (Boy/En/Yükseklik) and need converting; a
  // standard variant's title is already plain mm text (e.g. "450x350x250")
  // since there's no structured dimension field on the variant itself.
  const geometryDimensionsMm = useCustomSize
    ? {
        length: customHeight * 10,
        width: customWidth * 10,
        height: customDepth * 10,
      }
    : parseDimensionsFromVariantTitle(selectedVariant?.title)

  const geometryPanels =
    geometryType === "fefco-0201" && geometryDimensionsMm
      ? (() => {
          try {
            return generateFefco0201({
              length: geometryDimensionsMm.length,
              width: geometryDimensionsMm.width,
              height: geometryDimensionsMm.height,
              thickness: 3,
            })
          } catch {
            return null
          }
        })()
      : null

  // A theme applies instantly (no AI, no network call) once a brand is
  // selected - resolveThemeTemplate() + resolveLayout() only, the same
  // deterministic engine applyDesign() already uses. Free to recompute
  // every render, same as applyDesign() below.
  const themedDesign =
    geometryPanels && selectedTheme && selectedBrand
      ? applyTheme(geometryPanels, THEMES[selectedTheme], selectedBrand, imageNaturalSizes)
      : null

  // The AI-generated layout (once requested) takes over from both the
  // theme and the live rule-based default - see the resets in
  // toggleElement/removeElement/handleSelectTheme for why it can't just
  // linger after its inputs change.
  const baseDesign = geometryPanels
    ? aiDesign ?? themedDesign ?? applyDesign(geometryPanels, selectedElements, imageNaturalSizes)
    : undefined

  // Manual drag overrides layer on top of whichever base design won above -
  // filtered (not blanket-reset) to whatever elementIds still exist in that
  // base design, so an unrelated edit elsewhere never silently discards a
  // drag the customer already made. See the manualOverrides state comment.
  const currentElementIds = new Set(
    (baseDesign?.resolvedLayout.panels ?? []).flatMap((p) =>
      p.elements.map((el) => el.elementId)
    )
  )
  const activeOverrides = Object.fromEntries(
    Object.entries(manualOverrides).filter(([id]) => currentElementIds.has(id))
  )
  const appliedDesign =
    baseDesign && Object.keys(activeOverrides).length > 0
      ? {
          ...baseDesign,
          resolvedLayout: applyManualOverrides(baseDesign.resolvedLayout, activeOverrides),
        }
      : baseDesign

  // When a 3D face click has focused the 2D view on one panel, the 2D
  // editor gets ONLY that panel's own geometry/elements - not a special
  // mode DielinePreview knows about, just a smaller `panels` array and a
  // resolvedLayout filtered to match. Its viewBox is derived from
  // whatever panels it's given, so handing it one panel alone is what
  // actually does the "zoom to this face" - and since cross-panel drag/
  // wrap logic only ever sees panels it's given, dragging can't reach a
  // neighbor that isn't there either, without any special-casing for that.
  const displayedPanels: typeof geometryPanels = focusedPanelName
    ? (geometryPanels?.filter((p) => p.panelName === focusedPanelName) ?? geometryPanels)
    : geometryPanels
  const displayedResolvedLayout =
    focusedPanelName && appliedDesign?.resolvedLayout
      ? {
          ...appliedDesign.resolvedLayout,
          panels: appliedDesign.resolvedLayout.panels.filter(
            (p) => p.panelName === focusedPanelName
          ),
        }
      : appliedDesign?.resolvedLayout

  // Shared by every manual-override writer below - always merges onto
  // whatever the element's override already had (never replaces it
  // wholesale), so a field written by one interaction (e.g. a resize's w/h,
  // or a text edit's `text`) survives a later, unrelated interaction (e.g.
  // a plain drag) instead of silently reverting to the element's original
  // value. panelName/secondaryPanelName are the one exception callers rely
  // on: passing them explicitly (even as `undefined`) - rather than
  // omitting them from patch - is what lets dragging an element back off a
  // seam actually clear a stale wrap.
  const patchManualOverride = (
    elementId: string,
    patch: Partial<ManualOverrides[string]>
  ) => {
    setManualOverrides((prev) => ({
      ...prev,
      [elementId]: { ...prev[elementId], ...patch },
    }))
  }

  const handleElementDragEnd = (
    elementId: string,
    position: { x: number; y: number },
    panelName: string,
    secondaryPanelName: string | undefined
  ) => {
    patchManualOverride(elementId, { ...position, panelName, secondaryPanelName })
  }

  const handleElementResize = (
    elementId: string,
    position: { x: number; y: number },
    size: { w: number; h: number },
    panelName: string,
    secondaryPanelName: string | undefined
  ) => {
    patchManualOverride(elementId, { ...position, ...size, panelName, secondaryPanelName })
  }

  // Commits an on-canvas inline text edit (double-click a text element to
  // start one, see DielinePreview's onEditText). Keyed by the element's own
  // elementId, not sourceElementId - editing one physical instance of a
  // repeated slogan only changes that one panel's copy, same as
  // drag/resize already only ever move one instance.
  const handleTextEdit = (elementId: string, newText: string) => {
    const current = (appliedDesign?.resolvedLayout.panels ?? [])
      .flatMap((p) => p.elements)
      .find((el) => el.elementId === elementId)
    if (!current) return

    const trimmed = newText.trim()
    if (!trimmed) {
      // Nothing left after editing - remove it rather than leave an
      // invisible, zero-content text element behind on the canvas.
      removeElement(current.sourceElementId ?? elementId)
      return
    }

    // Keep the current font size (derived the exact same way the canvas
    // itself renders it) - editing text shouldn't suddenly shrink/grow the
    // font, only its measured width/height at that unchanged size.
    const font = typeof current.content.font === "string" ? current.content.font : null
    const fontWeight =
      typeof current.content.fontWeight === "number" ? current.content.fontWeight : 400
    const uppercase = current.content.uppercase === true
    const fontSize = font
      ? Math.max(MIN_TEXT_SIZE, fontSizeForInkHeight(font, fontWeight, uppercase, current.size.h))
      : Math.max(MIN_TEXT_SIZE, current.size.h)
    const measured = font ? measureText(trimmed, font, fontWeight, fontSize, uppercase) : null
    const newSize = measured ? { w: measured.width, h: measured.height } : current.size

    // Recenter around the box's OLD center, rather than keeping its old
    // top-left corner fixed - otherwise a width change (near-certain once
    // the text itself changes) would visibly drift the text sideways
    // instead of growing/shrinking evenly around where it already was.
    const centerX = current.position.x + current.size.w / 2
    const centerY = current.position.y + current.size.h / 2

    patchManualOverride(elementId, {
      x: centerX - newSize.w / 2,
      y: centerY - newSize.h / 2,
      w: newSize.w,
      h: newSize.h,
      text: trimmed,
    })
  }

  // geometryPanels changing (custom-size edit, product/variant swap) is a
  // new dieline, not a nudge - stale AI results and drag overrides computed
  // against the old geometry shouldn't silently carry over onto it.
  const geometryFingerprint = geometryDimensionsMm
    ? `${geometryDimensionsMm.length}x${geometryDimensionsMm.width}x${geometryDimensionsMm.height}`
    : null
  const lastGeometryFingerprint = useRef(geometryFingerprint)
  useEffect(() => {
    if (lastGeometryFingerprint.current !== geometryFingerprint) {
      // null -> a real fingerprint is "the customer just picked a size for
      // the first time this session," not "the size changed" - on a fresh
      // page load, geometryFingerprint starts null (no variant/size chosen
      // yet) even when a saved draft already restored manualOverrides, so
      // treating this transition as a reset would immediately wipe a
      // draft's positions the moment the customer re-picks the same size
      // they'd already configured before. Only an actual OLD -> NEW
      // fingerprint change (a genuinely different size) still resets.
      const isFirstRealGeometry =
        lastGeometryFingerprint.current === null && geometryFingerprint !== null
      lastGeometryFingerprint.current = geometryFingerprint
      if (!isFirstRealGeometry) {
        setAiDesign(null)
        setManualOverrides({})
      }
    }
  }, [geometryFingerprint])

  // Auto-saves the customer's current brand/theme/element selection and
  // manual drag/resize edits, 1.2s after the last change - the very first
  // render is skipped so it doesn't immediately re-save the exact same
  // data initialDesignDraft just loaded. Best-effort and silent by design
  // (saveDesignDraft never throws) - an auto-save failing mid-edit should
  // never interrupt the customer or need their attention.
  const isFirstRenderForAutoSave = useRef(true)
  useEffect(() => {
    if (isFirstRenderForAutoSave.current) {
      isFirstRenderForAutoSave.current = false
      return
    }
    if (!product) return

    const timeout = setTimeout(() => {
      saveDesignDraft({
        product_id: product.id,
        brand_id: selectedBrandId,
        selected_theme: selectedTheme,
        selected_elements: selectedElements,
        manual_overrides: manualOverrides,
      })
    }, 1200)

    return () => clearTimeout(timeout)
  }, [product, selectedBrandId, selectedTheme, selectedElements, manualOverrides])

  const filteredProducts = activeCategoryId
    ? products.filter((p) =>
        p.categories?.some((c) => c.id === activeCategoryId)
      )
    : products

  const handleSelectProduct = (handle: string | null | undefined) => {
    if (!handle) return
    router.push(`/${countryCode}/tasarla?product=${handle}`)
  }

  // What this session already put in the cart, so revisiting step 2 and
  // pressing the button again doesn't add a duplicate line.
  const addedToCartKey = useRef<string | null>(null)

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return
    const key = `${selectedVariant.id}:${quantity}`
    if (addedToCartKey.current !== key) {
      setIsAdding(true)
      await addToCart({
        variantId: selectedVariant.id,
        quantity,
        countryCode,
        // The design itself is the customer's (customer, product) draft; this
        // flag lets the cart show "Tasarım: Eklendi" with a link back.
        metadata: { has_design: true },
      })
      setIsAdding(false)
      addedToCartKey.current = key
    }
    advance()
  }

  // No variant exists for a custom size, so this adds the product's base
  // variant with the requested dimensions attached as metadata - someone on
  // the team follows up with real pricing, the cart total isn't final yet.
  const handleRequestCustomQuote = async () => {
    const baseVariantId = product?.variants?.[0]?.id
    if (!baseVariantId || customSizeErrors.length > 0) return
    const key = `custom:${customWidth}x${customHeight}x${customDepth}:${quantity}`
    if (addedToCartKey.current === key) return advance()

    setIsAdding(true)
    await addToCart({
      variantId: baseVariantId,
      quantity,
      countryCode,
      metadata: {
        has_design: true,
        custom_size: true,
        custom_width_cm: customWidth,
        custom_height_cm: customHeight,
        custom_depth_cm: customDepth,
      },
    })
    setIsAdding(false)
    addedToCartKey.current = key
    advance()
  }

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiPrompt.trim()) return

    if (!geometryPanels) {
      setAiMessage("Önce bir ürün ve ölçü seçin.")
      return
    }
    if (selectedElements.length === 0) {
      setAiMessage("Önce Marka Kiti'nden en az bir logo veya slogan seçin.")
      return
    }

    setIsGeneratingAiDesign(true)
    try {
      const result = await generateAiDesign(
        geometryPanels,
        selectedElements,
        aiPrompt,
        selectedTheme
      )
      setAiDesign(result)
      const themeLabel = selectedTheme
        ? listThemes().find((t) => t.id === selectedTheme)?.label
        : null
      const baseMessage = themeLabel
        ? `${themeLabel} temasıyla bir tasarım önerisi oluşturuldu.`
        : "Bir tasarım önerisi oluşturuldu."
      setAiMessage(
        result.warningMessage ? `${baseMessage} ${result.warningMessage}` : baseMessage
      )
    } catch {
      setAiMessage("Tasarım oluşturulurken bir sorun oluştu, tekrar deneyin.")
    } finally {
      setIsGeneratingAiDesign(false)
    }
  }

  // The card's primary button reads "Devam et" on every step; what it does
  // depends on the step (step 2 also adds the item to the cart, the last
  // step opens the cart).
  const primaryAction = (className: string) => {
    switch (activeTool) {
      case "urun":
        return (
          <Button onClick={advance} disabled={!product} className={className} data-testid="designer-next">
            Devam et
          </Button>
        )
      case "komponent":
        return useCustomSize ? (
          <Button
            onClick={handleRequestCustomQuote}
            disabled={!product || isAdding || customSizeErrors.length > 0}
            isLoading={isAdding}
            className={className}
            data-testid="designer-request-quote"
          >
            Devam et
          </Button>
        ) : (
          <Button
            onClick={handleAddToCart}
            disabled={!selectedVariant || isAdding}
            isLoading={isAdding}
            className={className}
            data-testid="designer-add-to-cart"
          >
            Devam et
          </Button>
        )
      case "ai":
        return (
          <Button
            onClick={() => router.push(`/${countryCode}/cart`)}
            className={className}
            data-testid="designer-go-to-cart"
          >
            Devam et
          </Button>
        )
      default:
        return (
          <Button onClick={advance} className={className} data-testid="designer-next">
            Devam et
          </Button>
        )
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Top bar */}
      <header className="hidden small:flex h-16 shrink-0 border-b border-black/10 items-center justify-between px-4 gap-x-4">
        <div className="flex h-full items-center gap-x-8 min-w-0">
          <LocalizedClientLink
            href="/"
            className="font-bold text-lg text-black shrink-0"
          >
            Packshop
          </LocalizedClientLink>
        </div>

        <div className="flex items-center gap-x-4 min-w-0">
          {product ? (
            <div className="hidden small:flex items-center gap-x-3 min-w-0">
              {image && (
                <div className="h-10 w-10 rounded-lg border border-black/10 bg-black/[0.02] flex items-center justify-center shrink-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-black truncate max-w-[180px]">
                  {product.title}
                </span>
                <span className="text-xs text-black/50">{quantity} adet</span>
              </div>
            </div>
          ) : (
            <span className="hidden small:block text-sm text-black/50">
              Bir ürün seçin
            </span>
          )}
          {displayPrice && (
            <span className="font-semibold text-black shrink-0">
              {displayPrice.calculated_price}
            </span>
          )}

        </div>
      </header>

      {/* Main row */}
      <div className="flex-1 flex flex-col min-h-0 small:flex-row small:gap-6 small:p-6">
        {/* Step rail (desktop) - numbered, done steps get a check, steps past
            the furthest unlocked one are disabled. Mobile shows the same
            progress over the canvas instead. */}
        <nav className="hidden small:flex w-44 shrink-0 flex-col gap-y-1 self-start">
          {STEPS.map((step, i) => {
            const active = i === stepIndex
            const done = i < maxStep && !active
            const locked = i > maxStep
            return (
              <button
                key={step.id}
                onClick={() => goToStep(i)}
                disabled={locked}
                className={`flex items-center gap-x-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  active ? "bg-black/[0.06] font-medium text-black" : locked ? "text-black/30" : "text-black/70 hover:bg-black/[0.04]"
                }`}
                data-testid={`designer-step-${step.id}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    active ? "bg-black text-white" : done ? "bg-green-600 text-white" : "bg-black/[0.06] text-black/50"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                {step.label}
              </button>
            )
          })}
        </nav>

        {/* Tool panel - a bottom sheet on mobile (swipe down to close), a
            floating card beside the rail from `small` up. */}
        <div
          className="order-2 relative flex h-[calc(100%*3/7)] shrink-0 flex-col border-t border-black/10 bg-white small:order-none small:h-auto small:max-h-full small:w-[340px] small:self-start small:overflow-hidden small:rounded-2xl small:border"
        >
          <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4 small:p-5">
          {activeTool === "urun" && (
            <div className="flex flex-col gap-y-4">
              <h2 className="text-lg font-semibold text-black">Ürün</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategoryId(null)}
                  className={`h-8 px-3 rounded-full border text-sm transition-colors ${
                    activeCategoryId === null
                      ? "border-black text-black"
                      : "border-black/10 text-black/70 hover:border-black/20"
                  }`}
                >
                  Tümü
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategoryId(category.id)}
                    className={`h-8 px-3 rounded-full border text-sm transition-colors ${
                      activeCategoryId === category.id
                        ? "border-black text-black"
                        : "border-black/10 text-black/70 hover:border-black/20"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map((p) => {
                  const isActive = p.id === product?.id
                  const thumb = p.thumbnail ?? p.images?.[0]?.url
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProduct(p.handle)}
                      className={`flex flex-col gap-y-2 p-2 rounded-lg border text-left transition-colors ${
                        isActive
                          ? "border-black"
                          : "border-black/10 hover:border-black/20"
                      }`}
                    >
                      <div className="aspect-square rounded-lg bg-black/[0.02] border border-black/10 overflow-hidden flex items-center justify-center">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt={p.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-black/30">Görsel yok</span>
                        )}
                      </div>
                      <span className="text-xs text-black/70 truncate">
                        {p.title}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {activeTool === "komponent" && !product && (
            <div className="flex flex-col gap-y-2">
              <h2 className="text-lg font-semibold text-black">Konfigürasyon</h2>
              <p className="text-sm text-black/50">
                Önce Ürün sekmesinden bir ürün seçin.
              </p>
            </div>
          )}

          {activeTool === "komponent" && product && (
            <div className="flex flex-col gap-y-6">
              <h2 className="text-lg font-semibold text-black">Konfigürasyon</h2>

              <div className="flex gap-2">
                <button
                  onClick={() => setUseCustomSize(false)}
                  className={`h-8 px-3 rounded-full border text-sm transition-colors ${
                    !useCustomSize
                      ? "border-black text-black"
                      : "border-black/10 text-black/70 hover:border-black/20"
                  }`}
                >
                  Standart ölçüler
                </button>
                <button
                  onClick={() => setUseCustomSize(true)}
                  className={`h-8 px-3 rounded-full border text-sm transition-colors ${
                    useCustomSize
                      ? "border-black text-black"
                      : "border-black/10 text-black/70 hover:border-black/20"
                  }`}
                >
                  Özel ölçü
                </button>
              </div>

              {!useCustomSize &&
                (product.options || []).map((option) => (
                  <div key={option.id} className="flex flex-col gap-y-2">
                    <span className="text-sm font-medium text-black">
                      {option.title}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(option.values || []).map((v) => {
                        const isSelected = options[option.id!] === v.value
                        return (
                          <button
                            key={v.id}
                            onClick={() =>
                              setOptions((prev) => ({
                                ...prev,
                                [option.id!]: v.value,
                              }))
                            }
                            className={`h-9 px-3 rounded-lg border text-sm transition-colors ${
                              isSelected
                                ? "border-black text-black"
                                : "border-black/10 text-black/70 hover:border-black/20"
                            }`}
                          >
                            {v.value}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

              {useCustomSize && sizeRanges && (
                <div className="flex flex-col gap-y-4">
                  {(
                    [
                      ["Boy", customHeight, setCustomHeight, sizeRanges.height],
                      ["En", customWidth, setCustomWidth, sizeRanges.width],
                      ["Yükseklik", customDepth, setCustomDepth, sizeRanges.depth],
                    ] as const
                  ).map(([label, value, setValue, range]) => (
                    <div key={label} className="flex flex-col gap-y-2">
                      <span className="text-sm font-medium text-black">
                        {label} (cm) — {range.min}-{range.max} cm arası
                      </span>
                      <input
                        type="number"
                        min={range.min}
                        max={range.max}
                        value={value}
                        onChange={(e) => {
                          const next = parseFloat(e.target.value)
                          if (isNaN(next)) return
                          setValue(
                            Math.min(range.max, Math.max(range.min, next))
                          )
                        }}
                        className="h-9 px-3 border border-black/10 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
                      />
                    </div>
                  ))}
                  {customSizeErrors.length > 0 && (
                    <div className="flex flex-col gap-y-1">
                      {customSizeErrors.map((error) => (
                        <p key={error} className="text-xs text-rose-500">
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-black/50">
                    Özel ölçü seçtiğinizde fiyat teklif gerektirir - ekibimiz
                    sipariş sonrası sizinle iletişime geçer.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-y-2">
                <span className="text-sm font-medium text-black">Adet</span>
                <div className="flex items-center gap-x-2">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-9 w-9 rounded-lg border border-black/10 text-black hover:bg-black/[0.04]"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-black">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="h-9 w-9 rounded-lg border border-black/10 text-black hover:bg-black/[0.04]"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTool === "marka-kiti" && (
            <BrandKitPanel
              brands={brands}
              selectedBrandId={selectedBrandId}
              onSelectBrand={setSelectedBrandId}
              selectedElementIds={selectedElementIds}
              onToggleElement={toggleElement}
            />
          )}

          {activeTool === "tema" && (
            <div className="flex flex-col gap-y-4">
              <div>
                <h2 className="text-lg font-semibold text-black">Tema</h2>
                <p className="text-sm text-black/50 mt-1">
                  AI ile oluştururken kullanılacak stili seçin.
                </p>
              </div>
              <div className="flex flex-col gap-y-2">
                {listThemes().map((theme) => {
                  const isSelected = selectedTheme === theme.id
                  return (
                    <button
                      key={theme.id}
                      onClick={() => handleSelectTheme(theme.id)}
                      className={`flex flex-col gap-y-1 p-3 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? "border-black bg-black/[0.03]"
                          : "border-black/10 hover:border-black/20"
                      }`}
                      data-testid={`designer-theme-${theme.id}`}
                    >
                      <span className="text-sm font-medium text-black">
                        {theme.label}
                      </span>
                      <span className="text-xs text-black/50">
                        {theme.description}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {activeTool === "ai" && (
            <div className="flex flex-col gap-y-5">
              <h2 className="text-lg font-semibold text-black">AI ile düzelt</h2>
          <div>
            {selectedElements.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedElements.map((el) => (
                  <span
                    key={el.id}
                    className="inline-flex items-center gap-x-1.5 h-8 pl-1.5 pr-2 rounded-full border border-black/10 bg-black/[0.02] text-xs text-black"
                  >
                    {el.type === "logo" && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={el.value}
                        alt="Logo"
                        className="h-5 w-5 rounded object-contain"
                      />
                    )}
                    {el.type === "color" && (
                      <span
                        className="h-4 w-4 rounded-full border border-black/10"
                        style={{ backgroundColor: el.value }}
                      />
                    )}
                    {el.type === "font" && (
                      <span style={{ fontFamily: el.value }}>Aa</span>
                    )}
                    {el.type === "custom-text" && (
                      <span
                        style={{
                          fontFamily: el.fontFamily,
                          fontWeight: el.fontWeight,
                          textTransform: el.uppercase ? "uppercase" : "none",
                        }}
                      >
                        Aa
                      </span>
                    )}
                    {el.type === "library-element" &&
                      (() => {
                        const entry = getLibraryElement(el.value)
                        return entry ? (
                          <svg viewBox={entry.viewBox} className="h-4 w-4">
                            {entry.markup}
                          </svg>
                        ) : null
                      })()}
                    {el.label}
                    <button
                      type="button"
                      onClick={() => removeElement(el.id)}
                      className="text-black/40 hover:text-black"
                      aria-label={`${el.label} öğesini kaldır`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <form
              onSubmit={handleAiSubmit}
              className="flex flex-col gap-2"
            >
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => {
                  setAiPrompt(e.target.value)
                  setAiMessage(null)
                }}
                placeholder={
                  selectedElements.length > 0
                    ? "Seçili öğeleri kullanarak bir tasarım tarif et..."
                    : selectedBrand
                    ? `${selectedBrand.brand_name} marka kitini kullanarak bir tasarım tarif et...`
                    : "Tasarımını tarif et, seçili öğeleri kullanarak senin için oluşturalım..."
                }
                className="flex-1 min-w-0 h-11 px-4 border border-black/10 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
                data-testid="designer-ai-input"
              />
              <Button
                type="submit"
                isLoading={isGeneratingAiDesign}
                disabled={isGeneratingAiDesign}
                className="h-11 w-full"
                data-testid="designer-ai-submit"
              >
                AI ile Oluştur
              </Button>
            </form>
            {aiMessage && (
              <p className="text-sm text-black/50 mt-2">{aiMessage}</p>
            )}
          </div>
              <details className="rounded-xl border border-black/10 p-3">
                <summary className="cursor-pointer text-sm font-medium text-black">Yazı ekle</summary>
                <div className="pt-3">
                  <TextPanel onAddCombo={toggleElement} />
                </div>
              </details>
              <details className="rounded-xl border border-black/10 p-3">
                <summary className="cursor-pointer text-sm font-medium text-black">Öğe ekle</summary>
                <div className="pt-3">
                  <ElementLibraryPanel
                    selectedElementIds={selectedElementIds}
                    onToggleElement={toggleElement}
                  />
                </div>
              </details>
            </div>
          )}
          </div>
          {/* Uber's full-width black "Search": the card's primary action -
              inside the card on desktop, a sticky bottom bar on mobile */}
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] small:pointer-events-auto small:static small:border-t small:border-black/10 small:p-4">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => goToStep(stepIndex - 1)}
                className="pointer-events-auto h-12 shrink-0 rounded-full border border-black/15 bg-white px-5 text-sm font-medium text-black shadow-sm small:rounded-lg small:shadow-none"
                data-testid="designer-back"
              >
                Geri
              </button>
            )}
            <div className="pointer-events-auto flex-1">
              {primaryAction("h-12 w-full rounded-full shadow-lg small:rounded-lg small:shadow-none")}
            </div>
          </div>
        </div>

        {/* Canvas + AI bar - pb-16 on mobile keeps content clear of the
            fixed bottom tab bar, which sits outside normal flow there */}
        <div className="order-1 relative flex h-[calc(100%*4/7)] shrink-0 flex-col overflow-hidden bg-black/[0.03] small:order-none small:h-auto small:min-h-0 small:flex-1 small:shrink small:rounded-2xl">
          {/* Mobile: no header band - logo and step progress float on the view */}
          <div className="absolute inset-x-3 top-3 z-10 flex flex-col gap-y-2 small:hidden">
            <LocalizedClientLink
              href="/"
              className="w-fit rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold text-black shadow-sm"
            >
              Packshop
            </LocalizedClientLink>
            <div
              className="flex w-full max-w-[60%] gap-1"
              aria-label={`Adım ${stepIndex + 1}/${STEPS.length}`}
            >
              {STEPS.map((step, i) => (
                <span
                  key={step.id}
                  className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-black" : "bg-black/15"}`}
                />
              ))}
            </div>
          </div>
          <div className="relative flex-1 bg-black/[0.02] small:bg-transparent flex items-center justify-center overflow-auto p-4 pt-24 small:p-8">
            {geometryPanels && (
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                {focusedPanelName && viewMode === "2d" && (
                  <button
                    type="button"
                    onClick={() => setFocusedPanelName(null)}
                    className="flex items-center gap-1 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs text-black/60 hover:text-black transition-colors"
                  >
                    ← {PANEL_DISPLAY_NAME[focusedPanelName] ?? focusedPanelName} · Tüm yüzler
                  </button>
                )}
                <div className="flex rounded-lg border border-black/10 bg-white p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("2d")
                      setFocusedPanelName(null)
                    }}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      viewMode === "2d" ? "bg-black text-white" : "text-black/60 hover:text-black"
                    }`}
                  >
                    2D
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("3d")
                      setFocusedPanelName(null)
                    }}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      viewMode === "3d" ? "bg-black text-white" : "text-black/60 hover:text-black"
                    }`}
                  >
                    3D
                  </button>
                </div>
              </div>
            )}
            {geometryPanels && viewMode === "3d" ? (
              <BoxPreview3D
                panels={geometryPanels}
                resolvedLayout={appliedDesign?.resolvedLayout}
                backgroundColors={appliedDesign?.backgroundColors}
                dimensionsMm={geometryDimensionsMm!}
                className="h-full w-full"
                onFaceClick={(panelName) => {
                  setFocusedPanelName(panelName)
                  setViewMode("2d")
                }}
              />
            ) : geometryPanels ? (
              <DielinePreview
                panels={displayedPanels!}
                resolvedLayout={displayedResolvedLayout}
                backgroundColors={appliedDesign?.backgroundColors}
                onDragEnd={handleElementDragEnd}
                onResize={handleElementResize}
                onEditText={handleTextEdit}
                onDeleteElement={removeElement}
                onDuplicateElement={duplicateElement}
                className="max-h-full max-w-full"
              />
            ) : image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={product?.title}
                className="max-h-full max-w-full object-contain"
                data-testid="designer-canvas-image"
              />
            ) : product ? (
              <span className="text-sm text-black/50">Görsel bulunamadı.</span>
            ) : (
              <span className="text-sm text-black/50">
                Bir ürün seçerek başlayın.
              </span>
            )}
          </div>


        </div>
      </div>
    </div>
  )
}

export default DesignerShell
