import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/core-flows"
import { BRAND_MODULE } from "../../../../../modules/brand"
import BrandModuleService from "../../../../../modules/brand/services/brand-module-service"

async function retrieveOwnBrand(
  brandModuleService: BrandModuleService,
  id: string,
  customerId: string
) {
  const brand = await brandModuleService.retrieveBrand(id).catch(() => null)
  if (!brand || brand.customer_id !== customerId) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Brand with id ${id} not found`)
  }
  return brand
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)

  const brand = await retrieveOwnBrand(brandModuleService, req.params.id, customerId)

  const files = req.files as Express.Multer.File[] | undefined
  if (!files?.length) {
    res.status(400).json({ message: "No files were uploaded" })
    return
  }

  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: files.map((file) => ({
        filename: file.originalname,
        mimeType: file.mimetype,
        content: file.buffer.toString("base64"),
        access: "public" as const,
      })),
    },
  })

  const existingUrls = (brand.alternate_logo_urls as string[] | null) ?? []
  const newUrls = result.map((file) => file.url)

  const updated = await brandModuleService.updateBrands({
    id: req.params.id,
    alternate_logo_urls: [...existingUrls, ...newUrls],
  })

  res.json({ brand: updated })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)

  const brand = await retrieveOwnBrand(brandModuleService, req.params.id, customerId)

  const { url } = req.body as { url?: string }
  const existingUrls = (brand.alternate_logo_urls as string[] | null) ?? []

  const updated = await brandModuleService.updateBrands({
    id: req.params.id,
    alternate_logo_urls: existingUrls.filter((existing) => existing !== url),
  })

  res.json({ brand: updated })
}
