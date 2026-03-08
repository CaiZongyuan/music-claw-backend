import { AppError } from '../errors/app-error'
import type { ParsedPlaylistResult, PlaylistSummary } from '../types/music'
import type { QqPlaylistClient, QqPlaylistPage, QqRawTrack } from './types'

export type QqShareUrlResolver = {
  resolve: (shareUrl: string) => Promise<string>
}

type ParseOptions = {
  pageSize?: number
}

export class QqPlaylistService {
  constructor(
    private readonly client: QqPlaylistClient,
    private readonly shareUrlResolver: QqShareUrlResolver = {
      resolve: async (shareUrl) => shareUrl,
    }
  ) {}

  async parsePlaylist(
    shareUrl: string,
    options: ParseOptions = {}
  ): Promise<ParsedPlaylistResult> {
    const resolvedShareUrl = await this.resolveShareUrl(shareUrl)
    const playlistId = this.extractPlaylistId(resolvedShareUrl)
    const pageSize = options.pageSize ?? 100

    try {
      const pages: QqPlaylistPage[] = []
      const tracks = []
      let page = 1
      let totalTracks = 0

      while (page === 1 || tracks.length < totalTracks) {
        const response = await this.client.getPlaylistPage(
          playlistId,
          page,
          pageSize
        )

        pages.push(response)
        totalTracks = response.playlist.trackCount
        tracks.push(
          ...response.tracks.map((track) =>
            this.normalizeTrack(track, response.playlist.id)
          )
        )

        if (response.tracks.length === 0 || tracks.length >= totalTracks) {
          break
        }

        page += 1
      }

      const firstPage = pages[0]

      if (!firstPage) {
        throw new AppError(
          'QQ_PLAYLIST_FETCH_FAILED',
          'QQ playlist did not return any data',
          502
        )
      }

      return {
        playlist: this.normalizePlaylist(firstPage.playlist),
        tracks,
        pagination: {
          pageSize,
          pagesFetched: pages.length,
        },
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      throw new AppError(
        'QQ_PLAYLIST_FETCH_FAILED',
        'Failed to fetch QQ playlist data',
        502,
        {
          shareUrl: resolvedShareUrl,
        }
      )
    }
  }

  private async resolveShareUrl(shareUrl: string) {
    try {
      return await this.shareUrlResolver.resolve(shareUrl)
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      throw new AppError(
        'QQ_SHARE_URL_RESOLVE_FAILED',
        'Failed to resolve QQ playlist share url',
        502,
        {
          shareUrl,
        }
      )
    }
  }

  private extractPlaylistId(shareUrl: string) {
    let url: URL

    try {
      url = new URL(shareUrl)
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

    const searchId = url.searchParams.get('id')

    if (searchId) {
      return searchId
    }

    const pathMatch = url.pathname.match(/\/playlist\/(\d+)/)

    if (pathMatch?.[1]) {
      return pathMatch[1]
    }

    throw new AppError(
      'INVALID_QQ_SHARE_URL',
      'Unsupported QQ playlist share url',
      400,
      {
        shareUrl,
      }
    )
  }

  private isSupportedQqHost(hostname: string) {
    return hostname === 'y.qq.com' || hostname.endsWith('.y.qq.com')
  }

  private normalizePlaylist(playlist: QqPlaylistPage['playlist']): PlaylistSummary {
    return {
      id: playlist.id,
      title: playlist.title,
      trackCount: playlist.trackCount,
      sourcePlatform: 'qq',
    }
  }

  private normalizeTrack(track: QqRawTrack, playlistId: string) {
    return {
      id: track.id,
      title: track.title,
      artists: track.artists,
      album: track.album,
      durationMs: track.durationSeconds
        ? track.durationSeconds * 1000
        : undefined,
      sourcePlatform: 'qq' as const,
      sourcePlaylistId: playlistId,
    }
  }
}
