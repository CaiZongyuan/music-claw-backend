import { AppError } from '../errors/app-error'
import type {
  MatchCandidate,
  MatchTracksResult,
  MatchStatus,
  NormalizedTrack,
  TrackMatchResult,
} from '../types/music'
import type {
  NeteaseCandidate,
  NeteaseSearchClient,
  NeteaseSearchQuery,
} from './types'

type MatchOptions = {
  page?: number
  pageSize?: number
}

export class NeteaseMatchingService {
  constructor(private readonly client: NeteaseSearchClient) {}

  async matchTracks(
    tracks: NormalizedTrack[],
    options: MatchOptions = {}
  ): Promise<MatchTracksResult> {
    const page = options.page ?? 1
    const pageSize = options.pageSize ?? 50
    const results: TrackMatchResult[] = []

    for (const track of tracks) {
      if (!track.title.trim() || track.artists.length === 0) {
        results.push({
          track,
          status: 'metadata_insufficient',
          candidates: [],
        })
        continue
      }

      const query: NeteaseSearchQuery = {
        title: track.title,
        artists: track.artists,
        ...(track.album ? { album: track.album } : {}),
      }

      try {
        const candidates = await this.client.searchTracks(query)
        const scoredCandidates = candidates
          .map((candidate) => this.scoreCandidate(candidate, track))
          .sort((left, right) => right.score - left.score)

        results.push({
          track,
          status: this.classifyStatus(scoredCandidates),
          candidates: this.selectCandidates(scoredCandidates),
        })
      } catch (error) {
        if (error instanceof AppError) {
          throw error
        }

        throw new AppError(
          'NETEASE_SEARCH_FAILED',
          'Failed to search Netease candidates',
          502,
          {
            trackId: track.id,
            trackTitle: track.title,
          }
        )
      }
    }

    const totalItems = results.length
    const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / pageSize)
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return {
      items: results.slice(start, end),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    }
  }

  private scoreCandidate(
    candidate: NeteaseCandidate,
    track: NormalizedTrack
  ): MatchCandidate {
    let score = 0

    if (this.normalizeText(candidate.title) === this.normalizeText(track.title)) {
      score += 60
    }

    if (this.sameArtists(candidate.artists, track.artists)) {
      score += 25
    }

    if (track.album) {
      if (this.normalizeText(candidate.album) === this.normalizeText(track.album)) {
        score += 15
      }
    }

    return {
      id: candidate.id,
      title: candidate.title,
      artists: candidate.artists,
      album: candidate.album,
      score,
    }
  }

  private classifyStatus(candidates: MatchCandidate[]): MatchStatus {
    const bestCandidate = candidates[0]
    const secondCandidate = candidates[1]

    if (!bestCandidate || bestCandidate.score < 70) {
      return 'unmatched'
    }

    if (
      secondCandidate &&
      secondCandidate.score >= 70 &&
      bestCandidate.score - secondCandidate.score < 10
    ) {
      return 'multiple_candidates'
    }

    return 'unique_match'
  }

  private selectCandidates(candidates: MatchCandidate[]) {
    const status = this.classifyStatus(candidates)

    if (status === 'unique_match') {
      return candidates.slice(0, 1)
    }

    if (status === 'multiple_candidates') {
      return candidates.filter((candidate) => candidate.score >= 70)
    }

    return candidates.filter((candidate) => candidate.score >= 70)
  }

  private sameArtists(left: string[], right: string[]) {
    if (left.length !== right.length) {
      return false
    }

    return left.every((artist, index) => {
      return this.normalizeText(artist) === this.normalizeText(right[index])
    })
  }

  private normalizeText(value?: string) {
    return (value ?? '').trim().toLowerCase()
  }
}
