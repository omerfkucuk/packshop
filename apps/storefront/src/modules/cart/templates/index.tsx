import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import { HttpTypes } from "@medusajs/types"

const CartTemplate = ({
  cart,
  customer,
  shippingOptions,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  shippingOptions: HttpTypes.StoreCartShippingOption[]
}) => {
  return (
    <div className="py-12">
      <div className="content-container" data-testid="cart-container">
        {cart?.items?.length ? (
          <div className="grid grid-cols-1 small:grid-cols-[1fr_380px] gap-8 small:gap-12">
            <div className="flex flex-col gap-y-6">
              {!customer && <SignInPrompt />}
              <ItemsTemplate cart={cart} />
            </div>
            <div className="relative">
              <div className="sticky top-12">
                {cart.region && <Summary cart={cart} shippingOptions={shippingOptions} />}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <EmptyCartMessage />
          </div>
        )}
      </div>
    </div>
  )
}

export default CartTemplate
