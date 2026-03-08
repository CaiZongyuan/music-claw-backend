import { describe, expect, it } from 'bun:test'

import { createApp } from '../src/app'
import { NeteaseMatchingService } from '../src/netease/netease-matching-service'
import { NeteasePlaylistImportService } from '../src/netease/netease-playlist-import-service'
import { QqPlaylistService } from '../src/qq/qq-playlist-service'
import { ConflictReviewService } from '../src/review/conflict-review-service'

const createTestApp = () => {
  const qqPlaylistService = new QqPlaylistService(
    {
      async getPlaylistPage() {
        return {
          playlist: {
            id: '12345',
            title: 'QQ Favorites',
            trackCount: 2,
          },
          tracks: [
            {
              id: 'track-1',
              title: '晴天',
              artists: ['周杰伦'],
              album: '叶惠美',
              durationSeconds: 269,
            },
            {
              id: 'track-2',
              title: '夜曲',
              artists: ['周杰伦'],
              album: '十一月的萧邦',
              durationSeconds: 244,
            },
          ],
        }
      },
    },
    {
      async resolve(shareUrl) {
        if (shareUrl.includes('c6.y.qq.com')) {
          return 'https://y.qq.com/n/ryqq/playlist/12345'
        }

        return shareUrl
      },
    }
  )

  const neteaseMatchingService = new NeteaseMatchingService({
    async searchTracks(query) {
      if (query.title === '晴天') {
        return [
          {
            id: 1001,
            title: '晴天',
            artists: ['周杰伦'],
            album: '叶惠美',
          },
        ]
      }

      return [
        {
          id: 1002,
          title: '夜曲',
          artists: ['周杰伦'],
          album: '十一月的萧邦',
        },
        {
          id: 1003,
          title: '夜曲',
          artists: ['周杰伦'],
          album: '十一月的萧邦',
        },
      ]
    },
  })

  const conflictReviewService = new ConflictReviewService()
  const neteasePlaylistImportService = new NeteasePlaylistImportService({
    async createPlaylist() {
      return { playlistId: 'playlist-1' }
    },
    async addTracksToPlaylist(_cookie, _playlistId, trackIds) {
      return {
        failures: [],
        successTrackIds: trackIds,
      }
    },
  })

  return createApp({
    conflictReviewService,
    neteaseMatchingService,
    neteasePlaylistImportService,
    qqPlaylistService,
  })
}

describe('http api', () => {
  it('parses QQ playlists over HTTP and exposes the verifier page controls', async () => {
    const app = createTestApp()
    const parseResponse = await app.request('/api/qq/parse', {
      body: JSON.stringify({
        pageSize: 100,
        shareUrl: 'https://c6.y.qq.com/base/fcgi-bin/u?__=8HtpQwcTDPrR',
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })

    expect(parseResponse.status).toBe(200)

    const parseBody = await parseResponse.json()

    expect(parseBody.playlist).toEqual({
      id: '12345',
      title: 'QQ Favorites',
      trackCount: 2,
      sourcePlatform: 'qq',
    })
    expect(parseBody.tracks).toHaveLength(2)

    const verifyResponse = await app.request('/verify')
    const verifyHtml = await verifyResponse.text()

    expect(verifyResponse.status).toBe(200)
    expect(verifyHtml).toContain(
      'https://c6.y.qq.com/base/fcgi-bin/u?__=8HtpQwcTDPrR'
    )
    expect(verifyHtml).toContain('总歌曲数')
    expect(verifyHtml).toContain('已解析数量')
    expect(verifyHtml).toContain('每页显示')
    expect(verifyHtml).toContain('<option value="20"')
    expect(verifyHtml).toContain('<option value="30"')
    expect(verifyHtml).toContain('<option value="50"')
    expect(verifyHtml).toContain('<option value="100"')
  })

  it('supports match, review, and import endpoints in sequence', async () => {
    const app = createTestApp()
    const parseResponse = await app.request('/api/qq/parse', {
      body: JSON.stringify({
        shareUrl: 'https://y.qq.com/n/ryqq/playlist/12345',
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })
    const parseBody = await parseResponse.json()
    const matchResponse = await app.request('/api/netease/match', {
      body: JSON.stringify({
        tracks: parseBody.tracks,
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })
    const matchBody = await matchResponse.json()

    expect(matchBody.items.map((item: { status: string }) => item.status)).toEqual([
      'unique_match',
      'multiple_candidates',
    ])

    const reviewResponse = await app.request('/api/review/session', {
      body: JSON.stringify({
        matchResults: matchBody.items,
        playlistId: parseBody.playlist.id,
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })
    const reviewBody = await reviewResponse.json()

    const conflictResponse = await app.request(
      `/api/review/${reviewBody.sessionId}/conflicts?category=multiple_candidates`
    )
    const conflictBody = await conflictResponse.json()

    expect(conflictBody.items).toHaveLength(1)

    const selectResponse = await app.request(
      `/api/review/${reviewBody.sessionId}/select`,
      {
        body: JSON.stringify({
          candidateId: 1002,
          trackId: 'track-2',
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      }
    )

    expect(selectResponse.status).toBe(200)

    const queueResponse = await app.request(
      `/api/review/${reviewBody.sessionId}/import-queue`
    )
    const queueBody = await queueResponse.json()

    expect(queueBody.items).toEqual([
      {
        trackId: 'track-1',
        selectionType: 'unique_match',
        candidateId: 1001,
      },
      {
        trackId: 'track-2',
        selectionType: 'selected_candidate',
        candidateId: 1002,
      },
    ])

    const importResponse = await app.request('/api/import', {
      body: JSON.stringify({
        batchSize: 2,
        cookie: 'MUSIC_U=valid-cookie',
        items: queueBody.items,
        playlistName: 'QQ Migration',
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })

    expect(importResponse.status).toBe(200)
    expect(await importResponse.json()).toEqual({
      playlistId: 'playlist-1',
      batches: [
        {
          batchNumber: 1,
          successCount: 2,
          failureCount: 0,
          failures: [],
        },
      ],
    })
  })
})
