export type SourcePlatform = 'qq' | 'netease'

export type PlaylistSummary = {
  id: string
  title: string
  trackCount: number
  sourcePlatform: SourcePlatform
}

export type PlaylistPagination = {
  pageSize: number
  pagesFetched: number
}

export type NormalizedTrack = {
  id: string
  title: string
  artists: string[]
  album?: string
  durationMs?: number
  sourcePlatform: SourcePlatform
  sourcePlaylistId: string
}

export type ImportBatchFailure = {
  trackId: string
  reason: string
}

export type ImportBatchSummary = {
  batchNumber: number
  successCount: number
  failureCount: number
  failures: ImportBatchFailure[]
}

export type ImportBatchResult = {
  playlistId: string
  batches: ImportBatchSummary[]
}

export type ParsedPlaylistResult = {
  playlist: PlaylistSummary
  tracks: NormalizedTrack[]
  pagination: PlaylistPagination
}

export type MatchStatus =
  | 'unique_match'
  | 'unmatched'
  | 'multiple_candidates'
  | 'metadata_insufficient'

export type MatchCandidate = {
  id: number
  title: string
  artists: string[]
  album?: string
  score: number
}

export type TrackMatchResult = {
  track: NormalizedTrack
  status: MatchStatus
  candidates: MatchCandidate[]
}

export type MatchPagination = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type MatchTracksResult = {
  items: TrackMatchResult[]
  pagination: MatchPagination
}

export type ReviewDecision =
  | { type: 'pending' }
  | { type: 'selected_candidate'; candidateId: number }
  | { type: 'skipped' }
  | { type: 'deferred' }

export type ConflictItem = TrackMatchResult & {
  decision: ReviewDecision
}

export type ConflictCategory = Exclude<
  MatchStatus,
  'unique_match'
>

export type ConflictPage = {
  items: ConflictItem[]
  pagination: {
    category: ConflictCategory
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export type ImportQueueItem = {
  trackId: string
  selectionType: 'unique_match' | 'selected_candidate'
  candidateId: number
}

export type ImportQueue = {
  items: ImportQueueItem[]
}
