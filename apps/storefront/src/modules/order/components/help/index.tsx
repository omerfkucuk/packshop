import { Heading } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import React from "react"

const Help = () => {
  return (
    <div className="mt-6">
      <Heading className="text-base font-semibold text-black">
        Yardıma mı ihtiyacınız var?
      </Heading>
      <div className="text-base text-black/70 my-2">
        <ul className="gap-y-2 flex flex-col">
          <li>
            <LocalizedClientLink href="/contact">İletişim</LocalizedClientLink>
          </li>
          <li>
            <LocalizedClientLink href="/contact">
              İade ve Değişim
            </LocalizedClientLink>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Help
