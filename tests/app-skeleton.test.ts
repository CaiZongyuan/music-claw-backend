import { describe, expect, it } from 'bun:test'

import { app } from '../src/app'
import { AppError } from '../src/errors/app-error'
import type {
  ImportBatchResult,
  NormalizedTrack,
  PlaylistSummary,
} from '../src/types/music'

describe('modular hono skeleton', () => {
  it('serves backend health metadata from the root route', async () => {
    const response = await app.request('/')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      name: 'music-claw-backend',
      status: 'ok',
      version: 'v1',
    })
  })

  it('exports shared playlist import domain types', () => {
    const playlist: PlaylistSummary = {
      id: 'qq-playlist-1',
      title: 'QQ Favorites',
      trackCount: 1,
      sourcePlatform: 'qq',
    }

    const track: NormalizedTrack = {
      id: 'track-1',
      title: '晴天',
      artists: ['周杰伦'],
      album: '叶惠美',
      durationMs: 269000,
      sourcePlatform: 'qq',
      sourcePlaylistId: playlist.id,
    }

    const batchResult: ImportBatchResult = {
      playlistId: 'netease-playlist-1',
      batches: [
        {
          batchNumber: 1,
          successCount: 1,
          failureCount: 0,
          failures: [],
        },
      ],
    }

    expect(track.sourcePlaylistId).toBe(playlist.id)
    expect(batchResult.batches[0]?.successCount).toBe(1)
  })

  it('provides an app error model with status, code, and details', () => {
    const error = new AppError('INVALID_INPUT', 'Invalid playlist url', 400, {
      field: 'url',
    })

    expect(error.code).toBe('INVALID_INPUT')
    expect(error.status).toBe(400)
    expect(error.details).toEqual({ field: 'url' })
  })
})
