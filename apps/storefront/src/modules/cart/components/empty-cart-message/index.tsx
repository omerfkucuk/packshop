import InteractiveLink from "@modules/common/components/interactive-link"

const EmptyCartMessage = () => {
  return (
    <div
      className="py-48 px-2 flex flex-col justify-center items-start"
      data-testid="empty-cart-message"
    >
      <h1 className="text-2xl font-bold tracking-tight text-black">
        Sepetim
      </h1>
      <p className="text-base text-black/70 mt-4 mb-6 max-w-[32rem]">
        Sepetinizde henüz ürün yok. Aşağıdaki bağlantıyı kullanarak ürünlerimize
        göz atabilirsiniz.
      </p>
      <div>
        <InteractiveLink href="/store">Ürünleri keşfet</InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage
