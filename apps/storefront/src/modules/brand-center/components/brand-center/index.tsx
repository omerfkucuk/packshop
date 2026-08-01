import React from "react"

import { Brand } from "@lib/data/brands"
import AddBrand from "../brand-card/add-brand"
import EditBrand from "../brand-card/edit-brand-modal"

type BrandCenterProps = {
  brands: Brand[]
}

const BrandCenter: React.FC<BrandCenterProps> = ({ brands }) => {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 mt-4">
        <AddBrand />
        {brands.map((brand) => (
          <EditBrand brand={brand} key={brand.id} />
        ))}
      </div>
    </div>
  )
}

export default BrandCenter
