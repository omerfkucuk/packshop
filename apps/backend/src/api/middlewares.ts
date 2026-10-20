import { authenticate, defineMiddlewares } from "@medusajs/framework/http"
import multer from "multer"
import { validateBusinessEmailMiddleware } from "./store/customers/validate-business-email"

const upload = multer({ storage: multer.memoryStorage() })

// /store/brands/shared/:shareId is intentionally left off this list - it's
// the public, unauthenticated view of a brand kit, meant to work for anyone
// with the link.
export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/webhooks/twenty",
      bodyParser: { preserveRawBody: true },
    },
    {
      method: ["POST"],
      matcher: "/store/customers/me",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        validateBusinessEmailMiddleware,
      ],
    },
    {
      method: ["POST"],
      matcher: "/store/customers/me/visit",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      method: ["GET", "POST"],
      matcher: "/store/brands",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/store/brands/:id",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      method: ["POST"],
      matcher: "/store/brands/:id/logo",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        upload.single("file"),
      ],
    },
    {
      method: ["POST"],
      matcher: "/store/brands/:id/alternate-logos",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        upload.array("files"),
      ],
    },
    {
      method: ["DELETE"],
      matcher: "/store/brands/:id/alternate-logos",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      method: ["POST"],
      matcher: "/store/designs/compose",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      method: ["GET", "PUT"],
      matcher: "/store/designs/draft",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
  ],
})
