"use server"

import { sdk } from "@lib/config"
import { revalidateTag } from "next/cache"
import { getAuthHeaders, getCacheTag } from "./cookies"

export type Brand = {
  id: string
  company_name: string | null
  brand_name: string
  slogan: string | null
  colors: string[] | null
  heading_font: string | null
  body_font: string | null
  instagram_url: string | null
  facebook_url: string | null
  twitter_url: string | null
  tiktok_url: string | null
  website_url: string | null
  logo_url: string | null
  alternate_logo_urls: string[] | null
  share_id: string
}

export type PublicBrand = Omit<Brand, "id" | "share_id">

export const listBrands = async (): Promise<Brand[]> => {
  const headers = { ...(await getAuthHeaders()) }

  return sdk.client
    .fetch<{ brands: Brand[] }>("/store/brands", {
      method: "GET",
      headers,
      cache: "no-store",
    })
    .then(({ brands }) => brands)
    .catch(() => [])
}

export const getSharedBrand = async (
  shareId: string
): Promise<PublicBrand | null> => {
  return sdk.client
    .fetch<{ brand: PublicBrand }>(`/store/brands/shared/${shareId}`, {
      method: "GET",
      cache: "no-store",
    })
    .then(({ brand }) => brand)
    .catch(() => null)
}

type BrandFormState = { success: boolean; error: string | null }

const brandFieldsFromFormData = (formData: FormData) => {
  const colors = formData
    .getAll("colors")
    .map((c) => String(c).trim())
    .filter(Boolean)

  const asStringOrUndefined = (key: string) => {
    const value = formData.get(key)
    return typeof value === "string" && value.trim() ? value.trim() : undefined
  }

  return {
    company_name: asStringOrUndefined("company_name"),
    brand_name: asStringOrUndefined("brand_name"),
    slogan: asStringOrUndefined("slogan"),
    heading_font: asStringOrUndefined("heading_font"),
    body_font: asStringOrUndefined("body_font"),
    instagram_url: asStringOrUndefined("instagram_url"),
    facebook_url: asStringOrUndefined("facebook_url"),
    twitter_url: asStringOrUndefined("twitter_url"),
    tiktok_url: asStringOrUndefined("tiktok_url"),
    website_url: asStringOrUndefined("website_url"),
    colors: colors.length ? colors : undefined,
  }
}

export const addBrand = async (
  _currentState: BrandFormState,
  formData: FormData
): Promise<BrandFormState> => {
  const headers = { ...(await getAuthHeaders()) }
  const body = brandFieldsFromFormData(formData)

  if (!body.brand_name) {
    return { success: false, error: "Marka adı gereklidir." }
  }

  return sdk.client
    .fetch("/store/brands", { method: "POST", headers, body })
    .then(async () => {
      const cacheTag = await getCacheTag("customers")
      revalidateTag(cacheTag)
      return { success: true, error: null }
    })
    .catch((err) => ({ success: false, error: String(err) }))
}

export const updateBrand = async (
  _currentState: BrandFormState,
  formData: FormData
): Promise<BrandFormState> => {
  const id = formData.get("brandId") as string
  const headers = { ...(await getAuthHeaders()) }
  const body = brandFieldsFromFormData(formData)

  if (!id) {
    return { success: false, error: "Brand ID is required" }
  }

  if (!body.brand_name) {
    return { success: false, error: "Marka adı gereklidir." }
  }

  return sdk.client
    .fetch(`/store/brands/${id}`, { method: "POST", headers, body })
    .then(async () => {
      const cacheTag = await getCacheTag("customers")
      revalidateTag(cacheTag)
      return { success: true, error: null }
    })
    .catch((err) => ({ success: false, error: String(err) }))
}

export const deleteBrand = async (id: string): Promise<void> => {
  const headers = { ...(await getAuthHeaders()) }

  await sdk.client.fetch(`/store/brands/${id}`, { method: "DELETE", headers })

  const cacheTag = await getCacheTag("customers")
  revalidateTag(cacheTag)
}
