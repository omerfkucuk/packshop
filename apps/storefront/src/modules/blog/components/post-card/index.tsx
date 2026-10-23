import { BlogPostMeta, formatPostDate } from "@lib/data/blog"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const PostCard = ({ post, featured = false }: { post: BlogPostMeta; featured?: boolean }) => (
  <LocalizedClientLink
    href={`/icerik-merkezi/${post.slug}`}
    className={`group flex flex-col gap-4 ${featured ? "small:grid small:grid-cols-2 small:items-center small:gap-10" : ""}`}
  >
    <div className="aspect-[3/2] overflow-hidden rounded-2xl bg-black/[0.04]">
      {post.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover}
          alt={post.title}
          loading={featured ? "eager" : "lazy"}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      )}
    </div>
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-black/60">{post.category}</span>
      <h3
        className={`font-bold tracking-tight text-black group-hover:underline underline-offset-4 ${
          featured ? "text-2xl small:text-4xl" : "text-lg"
        }`}
      >
        {post.title}
      </h3>
      <p className={`text-black/70 ${featured ? "text-base" : "text-sm line-clamp-2"}`}>{post.description}</p>
      <span className="text-xs text-black/50">
        {formatPostDate(post.date)} · {post.readingMinutes} dk okuma
      </span>
    </div>
  </LocalizedClientLink>
)

export default PostCard
