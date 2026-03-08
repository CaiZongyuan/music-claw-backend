export type PlaylistCreationResult = {
  playlistId: string
}

export type PlaylistTrackFailure = {
  trackId: number
  reason: string
}

export type PlaylistTrackImportResult = {
  successTrackIds: number[]
  failures: PlaylistTrackFailure[]
}

export type NeteasePlaylistClient = {
  createPlaylist: (
    cookie: string,
    name: string
  ) => Promise<PlaylistCreationResult>
  addTracksToPlaylist: (
    cookie: string,
    playlistId: string,
    trackIds: number[]
  ) => Promise<PlaylistTrackImportResult>
}
