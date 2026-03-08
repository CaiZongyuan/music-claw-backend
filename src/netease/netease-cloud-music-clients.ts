import * as NeteaseCloudMusicApi from 'NeteaseCloudMusicApi'

import { AppError } from '../errors/app-error'
import type {
  NeteaseCandidate,
  NeteaseSearchClient,
  NeteaseSearchQuery,
} from './types'
import type {
  NeteasePlaylistClient,
  PlaylistCreationResult,
  PlaylistTrackImportResult,
} from './playlist-types'

type ApiBody = Record<string, unknown>

export class NeteaseCloudMusicSearchClient implements NeteaseSearchClient {
  async searchTracks(query: NeteaseSearchQuery): Promise<NeteaseCandidate[]> {
    const keywords = [query.title, query.artists.join(' '), query.album]
      .filter(Boolean)
      .join(' ')
      .trim()

    const response = await NeteaseCloudMusicApi.cloudsearch({
      keywords,
      limit: 10,
      type: 1,
    })
    const body = this.getBody(response)
    const result = this.getRecord(body.result)
    const songs = Array.isArray(result.songs) ? result.songs : []

    return songs.map((song) => {
      const songRecord = this.getRecord(song)
      const album = this.getRecord(songRecord.al)
      const artists = Array.isArray(songRecord.ar)
        ? songRecord.ar
            .map((artist) => this.getRecord(artist).name)
            .filter((artist): artist is string => typeof artist === 'string')
        : []

      return {
        album: typeof album.name === 'string' ? album.name : undefined,
        artists,
        id: Number(songRecord.id),
        title: typeof songRecord.name === 'string' ? songRecord.name : '',
      }
    })
  }

  private getBody(response: unknown) {
    const record = this.getRecord(response)

    return this.getRecord(record.body)
  }

  private getRecord(value: unknown): ApiBody {
    return value && typeof value === 'object' ? (value as ApiBody) : {}
  }
}

export class NeteaseCloudMusicPlaylistClient implements NeteasePlaylistClient {
  async createPlaylist(
    cookie: string,
    name: string
  ): Promise<PlaylistCreationResult> {
    const response = await NeteaseCloudMusicApi.playlist_create({
      cookie,
      name,
      privacy: 0,
    })
    const body = this.getBody(response)

    this.assertAuthenticated(body)

    const playlist = this.getRecord(body.playlist)
    const playlistId = playlist.id ?? body.id

    if (!playlistId) {
      throw new AppError(
        'NETEASE_PLAYLIST_CREATE_FAILED',
        'Netease playlist creation did not return a playlist id',
        502,
        {
          name,
        }
      )
    }

    return {
      playlistId: String(playlistId),
    }
  }

  async addTracksToPlaylist(
    cookie: string,
    playlistId: string,
    trackIds: number[]
  ): Promise<PlaylistTrackImportResult> {
    const response = await NeteaseCloudMusicApi.playlist_tracks({
      cookie,
      op: 'add',
      pid: playlistId,
      tracks: trackIds.join(','),
    })
    const body = this.getBody(response)

    this.assertAuthenticated(body)

    if (body.code !== 200) {
      throw new AppError(
        'NETEASE_TRACK_IMPORT_FAILED',
        typeof body.message === 'string'
          ? body.message
          : 'Failed to import tracks into Netease playlist',
        502,
        {
          playlistId,
        }
      )
    }

    return {
      failures: [],
      successTrackIds: trackIds,
    }
  }

  private assertAuthenticated(body: ApiBody) {
    if (body.code === 301 || body.code === 302) {
      throw new AppError(
        'NETEASE_COOKIE_INVALID',
        'Netease cookie is invalid or expired',
        401
      )
    }
  }

  private getBody(response: unknown) {
    const record = this.getRecord(response)

    return this.getRecord(record.body)
  }

  private getRecord(value: unknown): ApiBody {
    return value && typeof value === 'object' ? (value as ApiBody) : {}
  }
}
