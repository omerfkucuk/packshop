import { Metadata } from "next"

import { BLOG_CATEGORIES, listPosts } from "@lib/data/blog"
import PostCard from "@modules/blog/components/post-card"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "İçerik Merkezi | Packshop",
  description: "Kargo poşeti, ambalaj ve marka deneyimi üzerine rehberler, ilham veren örnekler ve Packshop haberleri.",
}

export default async function IcerikMerkeziPage(props: {
  searchParams: Promise<{ kategori?: string }>
}) {
  const { kategori } = await props.searchParams
  const all = await listPosts()
  const posts = kategori ? all.filter((p) => p.category === kategori) : all
  // The newest post leads the unfiltered page.
  const featured = kategori ? undefined : posts[0]
  const rest = featured ? posts.slice(1) : posts

  return (
    <div className="content-container py-10 small:py-16">
      <h1 className="text-4xl small:text-5xl font-bold tracking-tight text-black">İçerik Merkezi</h1>
      <p className="mt-3 max-w-xl text-base text-black/70">
        Kargo poşeti, ambalaj ve marka deneyimi üzerine rehberler, ilham veren örnekler ve haberler.
      </p>

      <nav className="no-scrollbar -mx-6 mt-8 flex gap-2 overflow-x-auto px-6 small:mx-0 small:px-0">
        {[undefined, ...BLOG_CATEGORIES].map((c) => {
          const active = c === kategori
          return (
            <LocalizedClientLink
              key={c ?? "tumu"}
              href={c ? `/icerik-merkezi?kategori=${encodeURIComponent(c)}` : "/icerik-merkezi"}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                active ? "bg-black text-white" : "bg-black/[0.05] text-black hover:bg-black/10"
              }`}
            >
              {c ?? "Tümü"}
            </LocalizedClientLink>
          )
        })}
      </nav>

      {posts.length === 0 ? (
        <p className="mt-12 text-black/60">Bu kategoride henüz yazı yok.</p>
      ) : (
        <>
          {featured && (
            <div className="mt-10">
              <PostCard post={featured} featured />
            </div>
          )}
          {rest.length > 0 && (
            <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-10 xsmall:grid-cols-2 medium:grid-cols-3">
              {rest.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
