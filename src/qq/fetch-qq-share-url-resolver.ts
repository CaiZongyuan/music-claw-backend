import { AppError } from '../errors/app-error'

type FetchLike = typeof fetch

const MAX_REDIRECTS = 5

export class FetchQqShareUrlResolver {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  async resolve(shareUrl: string) {
    let currentUrl = shareUrl

    for (let redirectCount = 0; redirectCount < MAX_REDIRECTS; redirectCount += 1) {
      const url = this.parseUrl(currentUrl)

      if (!this.isSupportedQqHost(url.hostname)) {
        throw new AppError(
          'INVALID_QQ_SHARE_URL',
          'Unsupported QQ playlist share url',
          400,
          {
            shareUrl,
          }
        )
      }

      if (this.isDirectPlaylistUrl(url)) {
        return currentUrl
      }

      const response = await this.fetchImpl(currentUrl, {
        headers: {
          referer: 'https://y.qq.com/',
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        },
        method: 'GET',
        redirect: 'manual',
      })

      const redirectLocation = response.headers.get('location')

      if (redirectLocation && response.status >= 300 && response.status < 400) {
        currentUrl = new URL(redirectLocation, currentUrl).toString()
        continue
      }

      if (response.redirected && response.url && response.url !== currentUrl) {
        currentUrl = response.url
        continue
      }

      const pageText = await response.text()
      const inlineRedirect = this.extractInlineRedirect(pageText, currentUrl)

      if (!inlineRedirect) {
        return currentUrl
      }

      currentUrl = inlineRedirect
    }

    throw new AppError(
      'QQ_SHARE_URL_RESOLVE_FAILED',
      'QQ playlist share url redirected too many times',
      502,
      {
        shareUrl,
      }
    )
  }

  private parseUrl(shareUrl: string) {
    try {
      return new URL(shareUrl)
    } catch {
      throw new AppError(
        'INVALID_QQ_SHARE_URL',
        'Unsupported QQ playlist share url',
        400,
        {
          shareUrl,
        }
      )
    }
  }

  private isSupportedQqHost(hostname: string) {
    return hostname === 'y.qq.com' || hostname.endsWith('.y.qq.com')
  }

  private isDirectPlaylistUrl(url: URL) {
    return Boolean(
      url.searchParams.get('id') || url.pathname.match(/\/playlist\/(\d+)/)
    )
  }

  private extractInlineRedirect(pageText: string, currentUrl: string) {
    const patterns = [
      /(?:window\.)?location(?:\.href|\.replace)?\s*=?\s*['"]([^'"]+)['"]/i,
      /content=['"][^'"]*url=([^'";]+)['"]/i,
    ]

    for (const pattern of patterns) {
      const match = pageText.match(pattern)

      if (match?.[1]) {
        return new URL(match[1], currentUrl).toString()
      }
    }

    return null
  }
}
