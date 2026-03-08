import { describe, expect, it } from 'bun:test'

import { AppError } from '../src/errors/app-error'
import { NeteaseMatchingService } from '../src/netease/netease-matching-service'
import type {
  NeteaseCandidate,
  NeteaseSearchClient,
  NeteaseSearchQuery,
} from '../src/netease/types'
import type { NormalizedTrack } from '../src/types/music'

const createTrack = (overrides: Partial<NormalizedTrack> = {}): NormalizedTrack => ({
  id: 'track-1',
  title: '晴天',
  artists: ['周杰伦'],
  album: '叶惠美',
  durationMs: 269000,
  sourcePlatform: 'qq',
  sourcePlaylistId: 'qq-list-1',
  ...overrides,
})

describe('netease matching service', () => {
  it('uses album-aware queries and classifies a single strong candidate as unique', async () => {
    const queries: NeteaseSearchQuery[] = []
    const client: NeteaseSearchClient = {
      async searchTracks(query) {
        queries.push(query)

        return [
          {
            id: 1001,
            title: '晴天',
            artists: ['周杰伦'],
            album: '叶惠美',
          },
        ]
      },
    }

    const service = new NeteaseMatchingService(client)
    const result = await service.matchTracks([createTrack()])

    expect(queries).toEqual([
      {
        title: '晴天',
        artists: ['周杰伦'],
        album: '叶惠美',
      },
    ])
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 50,
      totalItems: 1,
      totalPages: 1,
    })
    expect(result.items[0]?.status).toBe('unique_match')
    expect(result.items[0]?.candidates).toEqual([
      {
        id: 1001,
        title: '晴天',
        artists: ['周杰伦'],
        album: '叶惠美',
        score: 100,
      },
    ])
  })

  it('falls back to title and artists when album metadata is missing', async () => {
    const queries: NeteaseSearchQuery[] = []
    const client: NeteaseSearchClient = {
      async searchTracks(query) {
        queries.push(query)

        return [
          {
            id: 2001,
            title: '稻香',
            artists: ['周杰伦'],
            album: '魔杰座',
          },
        ]
      },
    }

    const service = new NeteaseMatchingService(client)
    const result = await service.matchTracks([
      createTrack({ id: 'track-2', title: '稻香', album: undefined }),
    ])

    expect(queries).toEqual([
      {
        title: '稻香',
        artists: ['周杰伦'],
      },
    ])
    expect(result.items[0]?.status).toBe('unique_match')
  })

  it('classifies close competing candidates as multiple candidates', async () => {
    const client: NeteaseSearchClient = {
      async searchTracks(): Promise<NeteaseCandidate[]> {
        return [
          {
            id: 3001,
            title: '夜曲',
            artists: ['周杰伦'],
            album: '十一月的萧邦',
          },
          {
            id: 3002,
            title: '夜曲',
            artists: ['周杰伦'],
            album: 'Live 2004',
          },
        ]
      },
    }

    const service = new NeteaseMatchingService(client)
    const result = await service.matchTracks([
      createTrack({ id: 'track-3', title: '夜曲', album: undefined }),
    ])

    expect(result.items[0]?.status).toBe('multiple_candidates')
    expect(result.items[0]?.candidates).toHaveLength(2)
  })

  it('marks tracks with missing title or artists as metadata insufficient without searching', async () => {
    let calls = 0
    const client: NeteaseSearchClient = {
      async searchTracks() {
        calls += 1
        return []
      },
    }

    const service = new NeteaseMatchingService(client)
    const result = await service.matchTracks([
      createTrack({ id: 'track-4', artists: [] }),
      createTrack({ id: 'track-5', title: '' }),
    ])

    expect(calls).toBe(0)
    expect(result.items.map((item) => item.status)).toEqual([
      'metadata_insufficient',
      'metadata_insufficient',
    ])
  })

  it('supports paginated batch results and surfaces upstream search failures', async () => {
    const client: NeteaseSearchClient = {
      async searchTracks(query) {
        if (query.title === '失败歌曲') {
          throw new Error('temporary upstream failure')
        }

        return [
          {
            id: 4001,
            title: query.title,
            artists: query.artists,
            album: query.album,
          },
        ]
      },
    }

    const service = new NeteaseMatchingService(client)

    const successPage = await service.matchTracks(
      [
        createTrack({ id: 'track-6', title: '简单爱' }),
        createTrack({ id: 'track-7', title: '安静' }),
      ],
      { page: 2, pageSize: 1 }
    )

    expect(successPage.pagination).toEqual({
      page: 2,
      pageSize: 1,
      totalItems: 2,
      totalPages: 2,
    })
    expect(successPage.items[0]?.track.id).toBe('track-7')

    await expect(
      service.matchTracks([createTrack({ id: 'track-8', title: '失败歌曲' })])
    ).rejects.toMatchObject({
      code: 'NETEASE_SEARCH_FAILED',
      status: 502,
    })
  })
})
