import { AppError } from '../errors/app-error'
import type { QqPlaylistClient, QqPlaylistPage, QqRawTrack } from './types'

type FetchLike = typeof fetch

type QqApiResponse = {
  req_0?: {
    code?: number
    data?: {
      dirinfo?: {
        title?: string
        songnum?: number
      }
      songlist?: unknown[]
      total_song_num?: number
    }
  }
  'music.srfDissInfo.DissInfo.CgiGetDiss'?: {
    code?: number
    data?: {
      dirinfo?: {
        title?: string
        songnum?: number
      }
      songlist?: unknown[]
      total_song_num?: number
    }
  }
}

const QQ_PLAYLIST_ENDPOINT = 'https://u.y.qq.com/cgi-bin/musicu.fcg'

export class FetchQqPlaylistClient implements QqPlaylistClient {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  async getPlaylistPage(
    playlistId: string,
    page: number,
    pageSize: number
  ): Promise<QqPlaylistPage> {
    const songBegin = (page - 1) * pageSize
    const response = await this.fetchImpl(QQ_PLAYLIST_ENDPOINT, {
      body: JSON.stringify({
        comm: {
          ct: 11,
          cv: 13020508,
          format: 'json',
          inCharset: 'utf-8',
          needNewCode: 1,
          outCharset: 'utf-8',
          platform: 'yqq.json',
          tmeAppID: 'qqmusic',
          uin: 0,
          uid: '3931641530',
          v: 13020508,
        },
        'music.srfDissInfo.DissInfo.CgiGetDiss': {
          method: 'CgiGetDiss',
          module: 'music.srfDissInfo.DissInfo',
          param: {
            dirid: 0,
            disstid: Number(playlistId),
            onlysonglist: 1,
            orderlist: 1,
            song_begin: songBegin,
            song_num: pageSize,
            tag: 1,
            userinfo: 1,
          },
        },
      }),
      headers: {
        'content-type': 'application/json',
        origin: 'https://y.qq.com',
        referer: 'https://y.qq.com/',
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      },
      method: 'POST',
    })

    if (!response.ok) {
      throw new AppError(
        'QQ_PLAYLIST_FETCH_FAILED',
        'Failed to fetch QQ playlist data',
        502,
        {
          page,
          playlistId,
          status: response.status,
        }
      )
    }

    const payload = (await response.json()) as QqApiResponse
    const requestData =
      payload['music.srfDissInfo.DissInfo.CgiGetDiss'] ?? payload.req_0

    if (!requestData?.data) {
      throw new AppError(
        'QQ_PLAYLIST_FETCH_FAILED',
        'QQ playlist response is missing data',
        502,
        {
          page,
          playlistId,
        }
      )
    }

    if ((requestData.code ?? 0) !== 0) {
      throw new AppError(
        'QQ_PLAYLIST_FETCH_FAILED',
        'QQ playlist upstream rejected the request',
        502,
        {
          page,
          playlistId,
          upstreamCode: requestData.code,
        }
      )
    }

    const dirinfo = requestData.data.dirinfo ?? {}
    const tracks = (requestData.data.songlist ?? []).map((track, index) => {
      return this.normalizeTrack(track, playlistId, page, index)
    })

    return {
      playlist: {
        id: playlistId,
        title: dirinfo.title ?? `QQ Playlist ${playlistId}`,
        trackCount:
          requestData.data.total_song_num ?? dirinfo.songnum ?? tracks.length,
      },
      tracks,
    }
  }

  private normalizeTrack(
    track: unknown,
    playlistId: string,
    page: number,
    index: number
  ): QqRawTrack {
    const rawTrack = typeof track === 'object' && track ? track : {}
    const trackRecord = rawTrack as Record<string, unknown>
    const singer = Array.isArray(trackRecord.singer) ? trackRecord.singer : []
    const artists = singer
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return ''
        }

        const name = (item as Record<string, unknown>).name
        return typeof name === 'string' ? name : ''
      })
      .filter(Boolean)

    const rawDuration = this.pickNumber([
      trackRecord.interval,
      trackRecord.duration,
      trackRecord.durationSeconds,
    ])

    return {
      album: this.pickString([
        trackRecord.albumname,
        this.pickNestedString(trackRecord, ['album', 'name']),
      ]),
      artists,
      durationSeconds: rawDuration,
      id:
        this.pickString([
          trackRecord.songid,
          trackRecord.id,
          trackRecord.songmid,
          trackRecord.mid,
        ]) ?? `${playlistId}-${page}-${index}`,
      title:
        this.pickString([
          trackRecord.songname,
          trackRecord.title,
          trackRecord.name,
        ]) ?? '',
    }
  }

  private pickString(values: unknown[]) {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value
      }

      if (typeof value === 'number') {
        return String(value)
      }
    }

    return undefined
  }

  private pickNumber(values: unknown[]) {
    for (const value of values) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value
      }

      if (typeof value === 'string' && value.trim()) {
        const parsedValue = Number(value)

        if (Number.isFinite(parsedValue)) {
          return parsedValue
        }
      }
    }

    return undefined
  }

  private pickNestedString(
    record: Record<string, unknown>,
    path: string[]
  ) {
    let current: unknown = record

    for (const segment of path) {
      if (!current || typeof current !== 'object') {
        return undefined
      }

      current = (current as Record<string, unknown>)[segment]
    }

    return typeof current === 'string' ? current : undefined
  }
}
