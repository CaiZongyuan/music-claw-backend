import { describe, expect, it } from 'bun:test'

import { AppError } from '../src/errors/app-error'
import { NeteasePlaylistImportService } from '../src/netease/netease-playlist-import-service'
import type { NeteasePlaylistClient } from '../src/netease/playlist-types'
import type { ImportQueueItem } from '../src/types/music'

const queueItems: ImportQueueItem[] = [
  { trackId: 'track-1', selectionType: 'unique_match', candidateId: 1001 },
  { trackId: 'track-2', selectionType: 'selected_candidate', candidateId: 1002 },
  { trackId: 'track-3', selectionType: 'selected_candidate', candidateId: 1003 },
]

describe('netease playlist import service', () => {
  it('creates a playlist and imports confirmed songs in batches', async () => {
    const batches: number[][] = []
    const client: NeteasePlaylistClient = {
      async createPlaylist(cookie, name) {
        expect(cookie).toBe('MUSIC_U=valid-cookie')
        expect(name).toBe('QQ Migration')

        return { playlistId: 'playlist-1' }
      },
      async addTracksToPlaylist(_cookie, _playlistId, trackIds) {
        batches.push(trackIds)

        return {
          successTrackIds: trackIds,
          failures: [],
        }
      },
    }

    const service = new NeteasePlaylistImportService(client)
    const result = await service.importPlaylist({
      cookie: 'MUSIC_U=valid-cookie',
      playlistName: 'QQ Migration',
      items: queueItems,
      batchSize: 2,
    })

    expect(batches).toEqual([
      [1001, 1002],
      [1003],
    ])
    expect(result).toEqual({
      playlistId: 'playlist-1',
      batches: [
        {
          batchNumber: 1,
          successCount: 2,
          failureCount: 0,
          failures: [],
        },
        {
          batchNumber: 2,
          successCount: 1,
          failureCount: 0,
          failures: [],
        },
      ],
    })
  })

  it('surfaces invalid cookie errors when playlist creation fails', async () => {
    const client: NeteasePlaylistClient = {
      async createPlaylist() {
        throw new AppError(
          'NETEASE_COOKIE_INVALID',
          'Netease cookie is invalid or expired',
          401
        )
      },
      async addTracksToPlaylist() {
        throw new Error('should not be called')
      },
    }

    const service = new NeteasePlaylistImportService(client)

    await expect(
      service.importPlaylist({
        cookie: 'MUSIC_U=expired-cookie',
        playlistName: 'QQ Migration',
        items: queueItems,
        batchSize: 2,
      })
    ).rejects.toMatchObject({
      code: 'NETEASE_COOKIE_INVALID',
      status: 401,
    })
  })

  it('reports partial failures and duplicate tracks in batch receipts', async () => {
    const client: NeteasePlaylistClient = {
      async createPlaylist() {
        return { playlistId: 'playlist-2' }
      },
      async addTracksToPlaylist(_cookie, _playlistId, trackIds) {
        return {
          successTrackIds: [trackIds[0]],
          failures: [
            {
              trackId: trackIds[1]!,
              reason: 'duplicate track',
            },
          ],
        }
      },
    }

    const service = new NeteasePlaylistImportService(client)
    const result = await service.importPlaylist({
      cookie: 'MUSIC_U=valid-cookie',
      playlistName: 'QQ Migration',
      items: queueItems.slice(0, 2),
      batchSize: 2,
    })

    expect(result).toEqual({
      playlistId: 'playlist-2',
      batches: [
        {
          batchNumber: 1,
          successCount: 1,
          failureCount: 1,
          failures: [
            {
              trackId: 'track-2',
              reason: 'duplicate track',
            },
          ],
        },
      ],
    })
  })
})
