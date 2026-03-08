import { AppError } from '../errors/app-error'
import type { ImportBatchResult, ImportQueueItem } from '../types/music'
import type { NeteasePlaylistClient } from './playlist-types'

type ImportPlaylistOptions = {
  cookie: string
  playlistName: string
  items: ImportQueueItem[]
  batchSize?: number
}

export class NeteasePlaylistImportService {
  constructor(private readonly client: NeteasePlaylistClient) {}

  async importPlaylist(
    options: ImportPlaylistOptions
  ): Promise<ImportBatchResult> {
    const batchSize = options.batchSize ?? 100
    const playlist = await this.createPlaylist(options.cookie, options.playlistName)
    const batches = []

    for (let index = 0; index < options.items.length; index += batchSize) {
      const batchItems = options.items.slice(index, index + batchSize)
      const trackIds = batchItems.map((item) => item.candidateId)
      const batchResult = await this.importBatch(
        options.cookie,
        playlist.playlistId,
        batchItems,
        trackIds,
        index / batchSize + 1
      )

      batches.push(batchResult)
    }

    return {
      playlistId: playlist.playlistId,
      batches,
    }
  }

  private async createPlaylist(cookie: string, playlistName: string) {
    try {
      return await this.client.createPlaylist(cookie, playlistName)
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      throw new AppError(
        'NETEASE_PLAYLIST_CREATE_FAILED',
        'Failed to create Netease playlist',
        502,
        {
          playlistName,
        }
      )
    }
  }

  private async importBatch(
    cookie: string,
    playlistId: string,
    batchItems: ImportQueueItem[],
    trackIds: number[],
    batchNumber: number
  ) {
    try {
      const response = await this.client.addTracksToPlaylist(
        cookie,
        playlistId,
        trackIds
      )
      const itemByCandidateId = new Map(
        batchItems.map((item) => [item.candidateId, item.trackId])
      )

      return {
        batchNumber,
        successCount: response.successTrackIds.length,
        failureCount: response.failures.length,
        failures: response.failures.map((failure) => ({
          trackId: itemByCandidateId.get(failure.trackId) ?? String(failure.trackId),
          reason: failure.reason,
        })),
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      throw new AppError(
        'NETEASE_TRACK_IMPORT_FAILED',
        'Failed to import tracks into Netease playlist',
        502,
        {
          playlistId,
          batchNumber,
        }
      )
    }
  }
}
