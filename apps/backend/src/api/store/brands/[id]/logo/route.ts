import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/core-flows"
import { BRAND_MODULE } from "../../../../../modules/brand"
import BrandModuleService from "../../../../../modules/brand/services/brand-module-service"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)

  const brand = await brandModuleService.retrieveBrand(req.params.id).catch(() => null)
  if (!brand || brand.customer_id !== customerId) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Brand with id ${req.params.id} not found`)
  }

  const file = req.file
  if (!file) {
    res.status(400).json({ message: "No file was uploaded" })
    return
  }

  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: [
        {
          filename: file.originalname,
          mimeType: file.mimetype,
          content: file.buffer.toString("base64"),
          access: "public",
        },
      ],
    },
  })

  const updated = await brandModuleService.updateBrands({
    id: req.params.id,
    logo_url: result[0].url,
  })

  res.json({ brand: updated })
}
