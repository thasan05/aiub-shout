import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

interface OGData {
  title?: string
  description?: string
  image?: string
  siteName?: string
  url: string
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 })

  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIUBShoutBot/1.0)' },
      signal: AbortSignal.timeout(4000),
    })

    if (!res.ok) return NextResponse.json({ url }, { status: 200 })

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return NextResponse.json({ url }, { status: 200 })

    // Cap at 500 KB to avoid reading huge pages
    const contentLength = res.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 524_288) return NextResponse.json({ url }, { status: 200 })

    const html = await res.text()
    if (html.length > 524_288) return NextResponse.json({ url }, { status: 200 })

    function getMeta(prop: string): string | undefined {
      const ogMatch = html.match(new RegExp(`<meta[^>]*property=["']og:${prop}["'][^>]*content=["']([^"']+)["']`, 'i'))
        ?? html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${prop}["']`, 'i'))
      if (ogMatch?.[1]) return ogMatch[1]
      const nameMatch = html.match(new RegExp(`<meta[^>]*name=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i'))
        ?? html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${prop}["']`, 'i'))
      return nameMatch?.[1]
    }

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)

    const data: OGData = {
      url,
      title: getMeta('title') ?? titleMatch?.[1]?.trim(),
      description: getMeta('description'),
      image: getMeta('image'),
      siteName: getMeta('site_name') ?? new URL(url).hostname.replace('www.', ''),
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch {
    return NextResponse.json({ url }, { status: 200 })
  }
}
