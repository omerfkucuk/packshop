import { listPosts } from "@lib/data/blog"
import PostCard from "@modules/blog/components/post-card"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

// The newest İçerik Merkezi posts; renders nothing until there's a post.
const LatestPosts = async () => {
  const posts = (await listPosts()).slice(0, 3)
  if (posts.length === 0) {
    return null
  }

  return (
    <section className="content-container py-12 small:py-20">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-3xl small:text-4xl font-bold tracking-tight text-black">İçerik Merkezi</h2>
        <LocalizedClientLink
          href="/icerik-merkezi"
          className="whitespace-nowrap text-sm font-medium text-black underline underline-offset-4 hover:no-underline"
        >
          Tüm yazılar
        </LocalizedClientLink>
      </div>
      {/* Sideways snap-scroll row on mobile, a grid from tablet up. */}
      <div className="no-scrollbar -mx-6 mt-8 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 xsmall:mx-0 xsmall:grid xsmall:grid-cols-2 xsmall:gap-x-6 xsmall:gap-y-10 xsmall:overflow-visible xsmall:px-0 medium:grid-cols-3">
        {posts.map((post) => (
          <div key={post.slug} className="w-[80%] shrink-0 snap-start xsmall:w-auto">
            <PostCard post={post} />
          </div>
        ))}
      </div>
    </section>
  )
}

export default LatestPosts
