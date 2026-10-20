"use client"

import React from "react"

import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

// The login email isn't editable (Medusa has no store-side email change),
// so this is a display-only row.
const ProfileEmail: React.FC<MyInformationProps> = ({ customer }) => {
  return (
    <AccountInfo
      label="E-posta adresi"
      currentInfo={customer.email}
      clearState={() => {}}
      readOnly
      data-testid="account-email-editor"
    />
  )
}

export default ProfileEmail
