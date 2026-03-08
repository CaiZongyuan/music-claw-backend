export type QqPlaylistMeta = {
  id: string
  title: string
  trackCount: number
}

export type QqRawTrack = {
  id: string
  title: string
  artists: string[]
  album?: string
  durationSeconds?: number
}

export type QqPlaylistPage = {
  playlist: QqPlaylistMeta
  tracks: QqRawTrack[]
}

export type QqPlaylistClient = {
  getPlaylistPage: (
    playlistId: string,
    page: number,
    pageSize: number
  ) => Promise<QqPlaylistPage>
}
