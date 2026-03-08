import { describe, expect, it } from 'bun:test'

import { ConflictReviewService } from '../src/review/conflict-review-service'
import type { MatchCandidate, TrackMatchResult } from '../src/types/music'

const createCandidate = (id: number, title: string): MatchCandidate => ({
  id,
  title,
  artists: ['周杰伦'],
  album: '叶惠美',
  score: 95,
})

const createMatchResult = (
  id: string,
  status: TrackMatchResult['status'],
  candidates: MatchCandidate[] = []
): TrackMatchResult => ({
  track: {
    id,
    title: `song-${id}`,
    artists: ['周杰伦'],
    album: '叶惠美',
    durationMs: 200000,
    sourcePlatform: 'qq',
    sourcePlaylistId: 'qq-list-1',
  },
  status,
  candidates,
})

describe('conflict review service', () => {
  it('archives conflict items by category and paginates category pages', () => {
    const service = new ConflictReviewService()
    const session = service.createSession('qq-list-1', [
      createMatchResult('track-1', 'unique_match', [createCandidate(1, '晴天')]),
      createMatchResult('track-2', 'multiple_candidates', [
        createCandidate(2, '夜曲'),
        createCandidate(3, '夜曲 Live'),
      ]),
      createMatchResult('track-3', 'multiple_candidates', [
        createCandidate(4, '简单爱'),
        createCandidate(5, '简单爱 Live'),
      ]),
      createMatchResult('track-4', 'unmatched'),
      createMatchResult('track-5', 'metadata_insufficient'),
    ])

    const multiplePage = service.getConflictPage(session.sessionId, {
      category: 'multiple_candidates',
      page: 2,
      pageSize: 1,
    })

    expect(multiplePage.pagination).toEqual({
      category: 'multiple_candidates',
      page: 2,
      pageSize: 1,
      totalItems: 2,
      totalPages: 2,
    })
    expect(multiplePage.items[0]?.track.id).toBe('track-3')
  })

  it('persists candidate selections, skips, and deferred decisions across refreshes', () => {
    const service = new ConflictReviewService()
    const session = service.createSession('qq-list-2', [
      createMatchResult('track-6', 'multiple_candidates', [
        createCandidate(6, '夜曲'),
        createCandidate(7, '夜曲 Live'),
      ]),
      createMatchResult('track-7', 'unmatched'),
      createMatchResult('track-8', 'metadata_insufficient'),
    ])

    service.selectCandidate(session.sessionId, 'track-6', 7)
    service.skipTrack(session.sessionId, 'track-7')
    service.deferTrack(session.sessionId, 'track-8')

    const multiplePage = service.getConflictPage(session.sessionId, {
      category: 'multiple_candidates',
    })
    const unmatchedPage = service.getConflictPage(session.sessionId, {
      category: 'unmatched',
    })
    const insufficientPage = service.getConflictPage(session.sessionId, {
      category: 'metadata_insufficient',
    })

    expect(multiplePage.items[0]?.decision).toEqual({
      type: 'selected_candidate',
      candidateId: 7,
    })
    expect(unmatchedPage.items[0]?.decision).toEqual({ type: 'skipped' })
    expect(insufficientPage.items[0]?.decision).toEqual({ type: 'deferred' })
  })

  it('keeps disputed songs out of the import queue until they are explicitly resolved', () => {
    const service = new ConflictReviewService()
    const session = service.createSession('qq-list-3', [
      createMatchResult('track-9', 'unique_match', [createCandidate(9, '晴天')]),
      createMatchResult('track-10', 'multiple_candidates', [
        createCandidate(10, '夜曲'),
        createCandidate(11, '夜曲 Live'),
      ]),
      createMatchResult('track-11', 'unmatched'),
    ])

    let importQueue = service.getImportQueue(session.sessionId)

    expect(importQueue.items).toEqual([
      {
        trackId: 'track-9',
        selectionType: 'unique_match',
        candidateId: 9,
      },
    ])

    service.selectCandidate(session.sessionId, 'track-10', 11)

    importQueue = service.getImportQueue(session.sessionId)

    expect(importQueue.items).toEqual([
      {
        trackId: 'track-9',
        selectionType: 'unique_match',
        candidateId: 9,
      },
      {
        trackId: 'track-10',
        selectionType: 'selected_candidate',
        candidateId: 11,
      },
    ])
  })
})
