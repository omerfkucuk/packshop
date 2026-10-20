import React from "react"

import AccountGrid from "../components/account-grid"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  return (
    <div className="flex-1 small:py-12" data-testid="account-page">
      <div className="flex-1 content-container h-full max-w-5xl mx-auto bg-white flex flex-col">
        <AccountGrid showBackLink={!!customer}>
          {children}
        </AccountGrid>
      </div>
    </div>
  )
}

export default AccountLayout
