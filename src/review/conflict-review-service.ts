import { AppError } from '../errors/app-error'
import type {
  ConflictCategory,
  ConflictItem,
  ConflictPage,
  ImportQueue,
  ReviewDecision,
  TrackMatchResult,
} from '../types/music'

type ConflictSession = {
  sessionId: string
  playlistId: string
  items: ConflictItem[]
}

type PageOptions = {
  category: ConflictCategory
  page?: number
  pageSize?: number
}

export class ConflictReviewService {
  private readonly sessions = new Map<string, ConflictSession>()

  private readonly uniqueCandidatesByPlaylist = new Map<
    string,
    { trackId: string; selectionType: 'unique_match'; candidateId: number }[]
  >()

  createSession(playlistId: string, matchResults: TrackMatchResult[]) {
    const sessionId = `review-${playlistId}`
    const uniqueSelections = matchResults
      .filter((item) => item.status === 'unique_match')
      .flatMap((item) => {
        const candidate = item.candidates[0]

        if (!candidate) {
          return []
        }

        return [
          {
            trackId: item.track.id,
            selectionType: 'unique_match' as const,
            candidateId: candidate.id,
          },
        ]
      })
    this.uniqueCandidatesByPlaylist.set(playlistId, uniqueSelections)

    const items = matchResults
      .filter((item) => item.status !== 'unique_match')
      .map((item) => ({
        ...item,
        decision: { type: 'pending' } as ReviewDecision,
      }))

    this.sessions.set(sessionId, {
      sessionId,
      playlistId,
      items,
    })

    return {
      sessionId,
      playlistId,
    }
  }

  getConflictPage(sessionId: string, options: PageOptions): ConflictPage {
    const session = this.requireSession(sessionId)
    const page = options.page ?? 1
    const pageSize = options.pageSize ?? 50
    const categoryItems = session.items.filter(
      (item) => item.status === options.category
    )
    const totalItems = categoryItems.length
    const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / pageSize)
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return {
      items: categoryItems.slice(start, end),
      pagination: {
        category: options.category,
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    }
  }

  selectCandidate(sessionId: string, trackId: string, candidateId: number) {
    const item = this.requireConflictItem(sessionId, trackId)

    if (!item.candidates.some((candidate) => candidate.id === candidateId)) {
      throw new AppError(
        'INVALID_CANDIDATE_SELECTION',
        'Selected candidate does not exist for this track',
        400,
        {
          trackId,
          candidateId,
        }
      )
    }

    item.decision = {
      type: 'selected_candidate',
      candidateId,
    }
  }

  skipTrack(sessionId: string, trackId: string) {
    this.requireConflictItem(sessionId, trackId).decision = { type: 'skipped' }
  }

  deferTrack(sessionId: string, trackId: string) {
    this.requireConflictItem(sessionId, trackId).decision = { type: 'deferred' }
  }

  getImportQueue(sessionId: string): ImportQueue {
    const session = this.requireSession(sessionId)
    const conflictSelections = session.items
      .flatMap((item) => {
        if (item.decision.type !== 'selected_candidate') {
          return []
        }

        return [
          {
            trackId: item.track.id,
            selectionType: 'selected_candidate' as const,
            candidateId: item.decision.candidateId,
          },
        ]
      })

    const uniqueSelections = this.buildUniqueSelections(session.playlistId)

    return {
      items: [...uniqueSelections, ...conflictSelections],
    }
  }

  private buildUniqueSelections(playlistId: string) {
    return this.uniqueCandidatesByPlaylist.get(playlistId) ?? []
  }

  private requireSession(sessionId: string) {
    const session = this.sessions.get(sessionId)

    if (!session) {
      throw new AppError('REVIEW_SESSION_NOT_FOUND', 'Review session not found', 404)
    }

    return session
  }

  private requireConflictItem(sessionId: string, trackId: string) {
    const session = this.requireSession(sessionId)
    const item = session.items.find((entry) => entry.track.id === trackId)

    if (!item) {
      throw new AppError('REVIEW_TRACK_NOT_FOUND', 'Review track not found', 404, {
        trackId,
      })
    }

    return item
  }
}
