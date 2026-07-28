"use client"

import { useState } from "react"
import { HttpTypes } from "@medusajs/types"
import { Container, clx } from "@modules/common/components/ui"
import Image from "next/image"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

// One large image + a thumbnail strip to switch between them, instead of
// stacking every image vertically - with several photos that stack got tall
// enough that scrolling through it left the sticky info column pinned next
// to whichever image happened to be mid-scroll, no longer lined up with the
// title the way it was at the top.
const ImageGallery = ({ images }: ImageGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0)

  if (!images.length) {
    return null
  }

  const activeImage = images[activeIndex] ?? images[0]

  return (
    <div className="flex flex-col gap-y-4">
      <Container className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-ui-bg-subtle">
        {!!activeImage.url && (
          <Image
            src={activeImage.url}
            priority
            className="absolute inset-0"
            alt="Product image"
            fill
            sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
            style={{
              objectFit: "cover",
            }}
          />
        )}
      </Container>
      {images.length > 1 && (
        <div className="flex gap-x-3 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={clx(
                "relative flex-shrink-0 w-20 aspect-[16/9] rounded-md overflow-hidden border-2 bg-ui-bg-subtle",
                {
                  "border-ui-border-interactive": index === activeIndex,
                  "border-transparent": index !== activeIndex,
                }
              )}
              data-testid="thumbnail-button"
            >
              {!!image.url && (
                <Image
                  src={image.url}
                  alt={`Küçük görsel ${index + 1}`}
                  fill
                  sizes="80px"
                  style={{
                    objectFit: "cover",
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ImageGallery
