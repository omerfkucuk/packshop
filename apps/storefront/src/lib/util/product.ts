import { HttpTypes } from "@medusajs/types";

export const isSimpleProduct = (product: HttpTypes.StoreProduct): boolean => {
    return product.options?.length === 1 && product.options[0].values?.length === 1;
}

export const isCustomProduct = (product: HttpTypes.StoreProduct): boolean => {
    return !!product.tags?.some((tag) => tag.value?.toLowerCase() === "custom");
}

// Known dieline geometry generators a product tag can point at, in
// @dtc/packaging-engine: FEFCO 0201 (box) and the self-seal courier bag
// (kargo poşeti).
export type GeometryType = "fefco-0201" | "courier-bag"

const GEOMETRY_TYPES: GeometryType[] = ["fefco-0201", "courier-bag"]

export const getGeometryType = (
    product: HttpTypes.StoreProduct
): GeometryType | null => {
    // Trimmed - tags are typed by hand in the admin, and a stray space
    // shouldn't silently turn the designer off.
    const tagValues = product.tags?.map((tag) => tag.value?.trim().toLowerCase()) ?? []
    return GEOMETRY_TYPES.find((type) => tagValues.includes(type)) ?? null
}