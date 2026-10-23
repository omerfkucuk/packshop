import { Metadata } from "next"
import { notFound } from "next/navigation"

import { formatPostDate, getPost, listPosts } from "@lib/data/blog"
import { getBaseURL } from "@lib/util/env"
import PostCard from "@modules/blog/components/post-card"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Props = { params: Promise<{ countryCode: string; slug: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params
  const post = await getPost(slug)
  if (!post) {
    notFound()
  }
  return {
    title: `${post.title} | Packshop`,
    description: post.description,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      images: post.cover ? [post.cover] : undefined,
    },
  }
}

export default async function PostPage(props: Props) {
  const { countryCode, slug } = await props.params
  const post = await getPost(slug)
  if (!post) {
    notFound()
  }

  const related = (await listPosts()).filter((p) => p.slug !== post.slug).slice(0, 3)

  // Article structured data for search results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    image: post.cover ? `${getBaseURL()}${post.cover}` : undefined,
    publisher: { "@type": "Organization", name: "Packshop" },
    mainEntityOfPage: `${getBaseURL()}/${countryCode}/icerik-merkezi/${post.slug}`,
  }

  return (
    <article className="content-container py-10 small:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-3xl">
        <LocalizedClientLink href="/icerik-merkezi" className="text-sm text-black/60 hover:text-black">
          ← İçerik Merkezi
        </LocalizedClientLink>
        <span className="mt-6 block text-xs font-semibold uppercase tracking-wide text-black/60">
          {post.category}
        </span>
        <h1 className="mt-2 text-3xl small:text-5xl font-bold tracking-tight text-black">{post.title}</h1>
        <p className="mt-4 text-lg text-black/70">{post.description}</p>
        <span className="mt-4 block text-sm text-black/50">
          {formatPostDate(post.date)} · {post.readingMinutes} dk okuma
        </span>
      </div>

      {post.cover && (
        <div className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.cover} alt={post.title} className="aspect-[2/1] w-full object-cover" />
        </div>
      )}

      <div
        className="prose prose-neutral mx-auto mt-10 max-w-3xl prose-headings:tracking-tight prose-a:underline-offset-4 prose-img:rounded-xl"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />

      <div className="mx-auto mt-12 flex max-w-3xl flex-col gap-4 rounded-2xl bg-black p-6 small:flex-row small:items-center small:justify-between small:p-8">
        <div>
          <p className="text-xl font-bold text-white">Kendi kargo poşetinizi tasarlayın</p>
          <p className="mt-1 text-sm text-white/70">Markanıza özel poşetinizi birkaç adımda hazırlayın.</p>
        </div>
        <LocalizedClientLink
          href="/tasarla"
          className="inline-flex h-12 w-fit shrink-0 items-center rounded-lg bg-white px-6 text-base font-medium text-black hover:bg-white/90"
        >
          Tasarlamaya başlayın
        </LocalizedClientLink>
      </div>

      {related.length > 0 && (
        <section className="mt-16 small:mt-24">
          <h2 className="text-2xl font-bold tracking-tight text-black">Diğer yazılar</h2>
          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 xsmall:grid-cols-2 medium:grid-cols-3">
            {related.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
