export type SourcePlatform = 'qq' | 'netease'

export type PlaylistSummary = {
  id: string
  title: string
  trackCount: number
  sourcePlatform: SourcePlatform
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
