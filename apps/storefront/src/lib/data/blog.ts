import "server-only"

import fs from "fs/promises"
import path from "path"
import matter from "gray-matter"
import { marked } from "marked"

// İçerik Merkezi posts are Markdown files in content/icerik-merkezi; the
// file name (without .md) is the post's URL slug. Content is ours, so the
// rendered HTML is trusted.
const POSTS_DIR = path.join(process.cwd(), "content", "icerik-merkezi")

export const BLOG_CATEGORIES = ["Rehberler", "İlham", "Haberler"] as const

export type BlogPostMeta = {
  slug: string
  title: string
  description: string
  date: string // YYYY-MM-DD
  category: string
  cover: string
  readingMinutes: number
}

export type BlogPost = BlogPostMeta & { html: string }

async function readPost(slug: string): Promise<BlogPost | null> {
  let raw: string
  try {
    raw = await fs.readFile(path.join(POSTS_DIR, `${slug}.md`), "utf8")
  } catch {
    return null
  }

  const { data, content } = matter(raw)
  // Drafts stay off the site until `draft: true` is removed.
  if (data.draft) {
    return null
  }

  const words = content.trim().split(/\s+/).length
  return {
    slug,
    title: String(data.title),
    description: String(data.description ?? ""),
    // gray-matter parses unquoted YAML dates into Date objects.
    date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date),
    category: String(data.category ?? "Rehberler"),
    cover: String(data.cover ?? ""),
    readingMinutes: Math.max(1, Math.round(words / 200)),
    html: await marked.parse(content),
  }
}

/** Published posts, newest first. */
export async function listPosts(): Promise<BlogPostMeta[]> {
  const files = await fs.readdir(POSTS_DIR).catch(() => [] as string[])
  const posts = await Promise.all(
    files.filter((f) => f.endsWith(".md")).map((f) => readPost(f.replace(/\.md$/, "")))
  )
  return posts
    .filter((p): p is BlogPost => !!p)
    .map(({ html: _html, ...meta }) => meta)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  // Slugs come from the URL - keep them to plain file names.
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return null
  }
  return readPost(slug)
}

export function formatPostDate(date: string): string {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${date}T00:00:00`)
  )
}
