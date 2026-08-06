import { HttpTypes } from "@medusajs/types";

export const isSimpleProduct = (product: HttpTypes.StoreProduct): boolean => {
    return product.options?.length === 1 && product.options[0].values?.length === 1;
}

export const isCustomProduct = (product: HttpTypes.StoreProduct): boolean => {
    return !!product.tags?.some((tag) => tag.value?.toLowerCase() === "custom");
}

// Known dieline geometry generators a product tag can point at - only
// FEFCO 0201 (box) exists in @dtc/packaging-engine so far.
export type GeometryType = "fefco-0201"

const GEOMETRY_TYPES: GeometryType[] = ["fefco-0201"]

export const getGeometryType = (
    product: HttpTypes.StoreProduct
): GeometryType | null => {
    const tagValues = product.tags?.map((tag) => tag.value?.toLowerCase()) ?? []
    return GEOMETRY_TYPES.find((type) => tagValues.includes(type)) ?? null
}