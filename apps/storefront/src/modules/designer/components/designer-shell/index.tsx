"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { isEqual } from "lodash"
import { HttpTypes } from "@medusajs/types"
import {
  CogSixTooth,
  Puzzle,
  Sparkles,
  Swatch,
  Text as TextIcon,
  Photo,
} from "@medusajs/icons"

// Imported from the box-styles subpath specifically (not the package root)
// so client bundles never pull in export/dxf.ts's @tarikjabiri/dxf
// dependency, which is only ever needed server-side.
import { generateFefco0201 } from "@dtc/packaging-engine/box-styles"

import { Brand } from "@lib/data/brands"
import { addToCart } from "@lib/data/cart"
import { getProductPrice } from "@lib/util/get-product-price"
import { getCustomSizeRanges } from "@lib/util/custom-size"
import { getGeometryType } from "@lib/util/product"
import { parseDimensionsFromVariantTitle } from "@lib/util/parse-variant-dimensions"
import { optionsAsKeymap } from "@modules/products/components/product-actions"
import { Button } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import DielinePreview from "../dieline-preview"

type Tool = "urun" | "komponent" | "marka-kiti" | "tema" | "yazi" | "elementler"

const TOOLS: { id: Tool; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "urun", label: "Ürün", icon: Photo },
  { id: "komponent", label: "Konfigürasyon", icon: CogSixTooth },
  { id: "marka-kiti", label: "Marka Kiti", icon: Swatch },
  { id: "tema", label: "Tema", icon: Sparkles },
  { id: "yazi", label: "Yazı", icon: TextIcon },
  { id: "elementler", label: "Elementler", icon: Puzzle },
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
}: DesignerShellProps) => {
  const router = useRouter()

  const initialVariant = product?.variants?.find((v) => v.id === initialVariantId)

  // Skip straight to the next step when we already have what it needs: no
  // product yet -> pick one, a product but no variant -> configure it, a
  // variant already chosen (e.g. arriving from a product page) -> brand kit.
  const [activeTool, setActiveTool] = useState<Tool>(() => {
    if (!product) return "urun"
    if (initialVariant) return "marka-kiti"
    return "komponent"
  })
  const hasAutoAdvancedToBrandKit = useRef(!!initialVariant)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
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
    brands[0]?.id ?? null
  )
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiMessage, setAiMessage] = useState<string | null>(null)

  const selectedVariant = useMemo(() => {
    return product?.variants?.find((v) =>
      isEqual(optionsAsKeymap(v.options), options)
    )
  }, [product, options])

  // First time the customer finishes configuring a variant in this session,
  // jump them to Marka Kiti - after that, let them click around freely.
  useEffect(() => {
    if (
      selectedVariant &&
      activeTool === "komponent" &&
      !hasAutoAdvancedToBrandKit.current
    ) {
      hasAutoAdvancedToBrandKit.current = true
      setActiveTool("marka-kiti")
    }
  }, [selectedVariant, activeTool])

  const selectedBrand = brands.find((b) => b.id === selectedBrandId) ?? null

  const price = product
    ? getProductPrice({ product, variantId: selectedVariant?.id })
    : null
  const displayPrice = price?.variantPrice || price?.cheapestPrice

  const image = product?.images?.[0]?.url ?? product?.thumbnail

  const geometryType = product ? getGeometryType(product) : null

  // Custom size inputs are already in cm (En/Boy/Derinlik); standard sizes
  // only exist as free text in the variant title (e.g. "K105 (45 cm x 35 cm
  // x 25 cm)") - there's no structured dimension field on the variant yet.
  const geometryDimensionsCm = useCustomSize
    ? { length: customHeight, width: customWidth, height: customDepth }
    : parseDimensionsFromVariantTitle(selectedVariant?.title)

  const geometryPanels =
    geometryType === "fefco-0201" && geometryDimensionsCm
      ? (() => {
          try {
            return generateFefco0201({
              length: geometryDimensionsCm.length * 10,
              width: geometryDimensionsCm.width * 10,
              height: geometryDimensionsCm.height * 10,
              thickness: 3,
            })
          } catch {
            return null
          }
        })()
      : null

  const filteredProducts = activeCategoryId
    ? products.filter((p) =>
        p.categories?.some((c) => c.id === activeCategoryId)
      )
    : products

  const handleSelectProduct = (handle: string | null | undefined) => {
    if (!handle) return
    router.push(`/${countryCode}/tasarla?product=${handle}`)
  }

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return

    setIsAdding(true)
    await addToCart({
      variantId: selectedVariant.id,
      quantity,
      countryCode,
    })
    setIsAdding(false)
    router.push(`/${countryCode}/cart`)
  }

  // No variant exists for a custom size, so this adds the product's base
  // variant with the requested dimensions attached as metadata - someone on
  // the team follows up with real pricing, the cart total isn't final yet.
  const handleRequestCustomQuote = async () => {
    const baseVariantId = product?.variants?.[0]?.id
    if (!baseVariantId) return

    setIsAdding(true)
    await addToCart({
      variantId: baseVariantId,
      quantity,
      countryCode,
      metadata: {
        custom_size: true,
        custom_width_cm: customWidth,
        custom_height_cm: customHeight,
        custom_depth_cm: customDepth,
      },
    })
    setIsAdding(false)
    router.push(`/${countryCode}/cart`)
  }

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiPrompt.trim()) return
    setAiMessage(
      "AI ile tasarım oluşturma özelliği yakında burada aktif olacak."
    )
  }

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Top bar */}
      <header className="h-16 shrink-0 border-b border-black/10 flex items-center justify-between px-4 gap-x-4">
        <LocalizedClientLink
          href="/"
          className="font-bold text-lg text-black shrink-0"
        >
          Packshop
        </LocalizedClientLink>

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
          {useCustomSize ? (
            <Button
              onClick={handleRequestCustomQuote}
              disabled={!product || isAdding}
              isLoading={isAdding}
              className="h-10 shrink-0"
              data-testid="designer-request-quote"
            >
              Teklif İste
            </Button>
          ) : (
            <Button
              onClick={handleAddToCart}
              disabled={!selectedVariant || isAdding}
              isLoading={isAdding}
              className="h-10 shrink-0"
              data-testid="designer-add-to-cart"
            >
              Sepete Ekle
            </Button>
          )}
        </div>
      </header>

      {/* Main row */}
      <div className="flex-1 flex min-h-0">
        {/* Icon rail */}
        <nav className="w-24 shrink-0 border-r border-black/10 flex flex-col items-center py-4 gap-y-1 overflow-y-auto">
          {TOOLS.map((tool) => {
            const Icon = tool.icon
            const active = activeTool === tool.id
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`flex flex-col items-center gap-y-1 w-20 py-2 rounded-lg text-[10px] transition-colors ${
                  active
                    ? "bg-black/[0.06] text-black font-medium"
                    : "text-black/50 hover:bg-black/[0.04] hover:text-black"
                }`}
                data-testid={`designer-tool-${tool.id}`}
              >
                <Icon className="h-5 w-5" />
                {tool.label}
              </button>
            )
          })}
        </nav>

        {/* Tool panel */}
        <div className="w-80 shrink-0 border-r border-black/10 overflow-y-auto p-5">
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
                      ["En", customWidth, setCustomWidth, sizeRanges.width],
                      ["Boy", customHeight, setCustomHeight, sizeRanges.height],
                      ["Derinlik", customDepth, setCustomDepth, sizeRanges.depth],
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
            <div className="flex flex-col gap-y-4">
              <h2 className="text-lg font-semibold text-black">Marka Kiti</h2>
              {brands.length === 0 ? (
                <div className="flex flex-col gap-y-3">
                  <p className="text-sm text-black/70">
                    Henüz bir markanız yok. Logo, renk ve yazı tipinizi
                    kullanmak için önce bir marka oluşturun.
                  </p>
                  <LocalizedClientLink
                    href="/marka-merkezi/yeni"
                    className="text-sm text-black underline underline-offset-2 hover:no-underline w-fit"
                  >
                    Marka oluştur
                  </LocalizedClientLink>
                </div>
              ) : (
                <div className="flex flex-col gap-y-3">
                  {brands.map((brand) => {
                    const isSelected = brand.id === selectedBrandId
                    return (
                      <button
                        key={brand.id}
                        onClick={() => setSelectedBrandId(brand.id)}
                        className={`flex items-center gap-x-3 p-3 rounded-lg border text-left transition-colors ${
                          isSelected
                            ? "border-black"
                            : "border-black/10 hover:border-black/20"
                        }`}
                      >
                        {brand.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={brand.logo_url}
                            alt={brand.brand_name}
                            className="h-10 w-10 rounded-lg border border-black/10 object-contain shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg border border-black/10 bg-black/[0.02] shrink-0" />
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-black truncate">
                            {brand.brand_name}
                          </span>
                          {!!brand.colors?.length && (
                            <div className="flex gap-x-1 mt-1">
                              {brand.colors.slice(0, 5).map((c) => (
                                <span
                                  key={c}
                                  className="h-3 w-3 rounded-full border border-black/10"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                  <LocalizedClientLink
                    href="/marka-merkezi/yeni"
                    className="text-sm text-black underline underline-offset-2 hover:no-underline w-fit"
                  >
                    Yeni marka ekle
                  </LocalizedClientLink>
                </div>
              )}
            </div>
          )}

          {(activeTool === "tema" ||
            activeTool === "yazi" ||
            activeTool === "elementler") && (
            <div className="flex flex-col gap-y-2">
              <h2 className="text-lg font-semibold text-black">
                {TOOLS.find((t) => t.id === activeTool)?.label}
              </h2>
              <p className="text-sm text-black/50">
                Bu araç yakında burada aktif olacak.
              </p>
            </div>
          )}
        </div>

        {/* Canvas + AI bar */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 bg-black/[0.02] flex items-center justify-center overflow-auto p-8">
            {geometryPanels ? (
              <DielinePreview
                panels={geometryPanels}
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
                Soldan bir ürün seçerek başlayın.
              </span>
            )}
          </div>

          {/* AI bar */}
          <div className="shrink-0 border-t border-black/10 p-4">
            <form
              onSubmit={handleAiSubmit}
              className="flex items-center gap-x-3"
            >
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => {
                  setAiPrompt(e.target.value)
                  setAiMessage(null)
                }}
                placeholder={
                  selectedBrand
                    ? `${selectedBrand.brand_name} marka kitini kullanarak bir tasarım tarif et...`
                    : "Tasarımını tarif et, seçili öğeleri kullanarak senin için oluşturalım..."
                }
                className="flex-1 h-11 px-4 border border-black/10 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
                data-testid="designer-ai-input"
              />
              <Button type="submit" className="h-11 shrink-0" data-testid="designer-ai-submit">
                AI ile Oluştur
              </Button>
            </form>
            {aiMessage && (
              <p className="text-sm text-black/50 mt-2">{aiMessage}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DesignerShell
