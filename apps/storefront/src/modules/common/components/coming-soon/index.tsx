type ComingSoonProps = {
  title: string
  description: string
}

const ComingSoon = ({ title, description }: ComingSoonProps) => {
  return (
    <div className="content-container flex flex-col items-center text-center gap-4 py-32 small:py-40">
      <span className="txt-compact-small-plus uppercase tracking-wide text-ui-fg-subtle">
        Çok yakında
      </span>
      <h1 className="text-3xl small:text-4xl font-bold max-w-2xl">{title}</h1>
      <p className="text-ui-fg-subtle max-w-lg">{description}</p>
    </div>
  )
}

export default ComingSoon
