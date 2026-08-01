import React from "react"
import { Plus } from "@medusajs/icons"

import { Brand } from "@lib/data/brands"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type BrandCenterProps = {
  brands: Brand[]
}

const BrandCenter: React.FC<BrandCenterProps> = ({ brands }) => {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 mt-4">
        <LocalizedClientLink
          href="/marka-merkezi/yeni"
          className="border border-black/10 hover:border-black/20 transition-colors rounded-lg p-5 min-h-[220px] h-full w-full flex flex-col justify-between"
          data-testid="add-brand-button"
        >
          <span className="font-semibold text-black">Yeni marka</span>
          <Plus />
        </LocalizedClientLink>

        {brands.map((brand) => (
          <LocalizedClientLink
            key={brand.id}
            href={`/marka-merkezi/${brand.id}`}
            className="border border-black/10 hover:border-black/20 transition-colors rounded-lg p-5 min-h-[220px] h-full w-full flex flex-col justify-between"
            data-testid="brand-container"
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-semibold text-black" data-testid="brand-name">
                  {brand.brand_name}
                </span>
                {brand.company_name && (
                  <span className="text-sm text-black/50">{brand.company_name}</span>
                )}
              </div>
              {brand.logo_url && (
                <div className="h-14 w-14 border border-black/10 rounded-lg bg-black/[0.02] flex items-center justify-center shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={brand.logo_url}
                    alt={brand.brand_name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
            </div>
            <span className="text-sm text-black/50">Düzenle →</span>
          </LocalizedClientLink>
        ))}
      </div>
    </div>
  )
}

export default BrandCenter
