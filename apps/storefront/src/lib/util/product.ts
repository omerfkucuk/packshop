import { HttpTypes } from "@medusajs/types";

export const isSimpleProduct = (product: HttpTypes.StoreProduct): boolean => {
    return product.options?.length === 1 && product.options[0].values?.length === 1;
}

export const isCustomProduct = (product: HttpTypes.StoreProduct): boolean => {
    return !!product.tags?.some((tag) => tag.value?.toLowerCase() === "custom");
}