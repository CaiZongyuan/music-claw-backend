import { describe, expect, it } from 'bun:test'

import { AppError } from '../src/errors/app-error'
import { QqPlaylistService } from '../src/qq/qq-playlist-service'
import type { QqPlaylistClient, QqPlaylistPage } from '../src/qq/types'

const createClient = (pages: QqPlaylistPage[]): QqPlaylistClient => {
  return {
    async getPlaylistPage(playlistId, page, pageSize) {
      expect(playlistId).toBe('12345')
      expect(pageSize).toBe(2)

      const currentPage = pages[page - 1]

      if (!currentPage) {
        throw new AppError(
          'QQ_PLAYLIST_FETCH_FAILED',
          `Missing page ${page}`,
          502
        )
      }

      return currentPage
    },
  }
}

describe('qq playlist parser', () => {
  it('fetches every page from a supported share link and normalizes tracks', async () => {
    const service = new QqPlaylistService(
      createClient([
        {
          playlist: {
            id: '12345',
            title: 'QQ Favorites',
            trackCount: 3,
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
              title: '七里香',
              artists: ['周杰伦'],
              album: '七里香',
              durationSeconds: 299,
            },
          ],
        },
        {
          playlist: {
            id: '12345',
            title: 'QQ Favorites',
            trackCount: 3,
          },
          tracks: [
            {
              id: 'track-3',
              title: '稻香',
              artists: ['周杰伦'],
              album: '魔杰座',
              durationSeconds: 223,
            },
          ],
        },
      ])
    )

    const result = await service.parsePlaylist(
      'https://i.y.qq.com/n2/m/share/details/taoge.html?id=12345',
      {
        pageSize: 2,
      }
    )

    expect(result.playlist).toEqual({
      id: '12345',
      title: 'QQ Favorites',
      trackCount: 3,
      sourcePlatform: 'qq',
    })
    expect(result.pagination).toEqual({
      pageSize: 2,
      pagesFetched: 2,
    })
    expect(result.tracks).toEqual([
      {
        id: 'track-1',
        title: '晴天',
        artists: ['周杰伦'],
        album: '叶惠美',
        durationMs: 269000,
        sourcePlatform: 'qq',
        sourcePlaylistId: '12345',
      },
      {
        id: 'track-2',
        title: '七里香',
        artists: ['周杰伦'],
        album: '七里香',
        durationMs: 299000,
        sourcePlatform: 'qq',
        sourcePlaylistId: '12345',
      },
      {
        id: 'track-3',
        title: '稻香',
        artists: ['周杰伦'],
        album: '魔杰座',
        durationMs: 223000,
        sourcePlatform: 'qq',
        sourcePlaylistId: '12345',
      },
    ])
  })

  it('returns a clear error for unsupported share links', async () => {
    const service = new QqPlaylistService({
      async getPlaylistPage() {
        throw new Error('should not be called')
      },
    })

    await expect(
      service.parsePlaylist('https://example.com/playlist/12345')
    ).rejects.toMatchObject({
      code: 'INVALID_QQ_SHARE_URL',
      status: 400,
    })
  })

  it('surfaces access denied errors from the upstream client', async () => {
    const service = new QqPlaylistService({
      async getPlaylistPage() {
        throw new AppError(
          'QQ_PLAYLIST_ACCESS_DENIED',
          'QQ playlist is not publicly accessible',
          403
        )
      },
    })

    await expect(
      service.parsePlaylist('https://y.qq.com/n/ryqq/playlist/12345')
    ).rejects.toMatchObject({
      code: 'QQ_PLAYLIST_ACCESS_DENIED',
      status: 403,
      message: 'QQ playlist is not publicly accessible',
    })
  })
})
