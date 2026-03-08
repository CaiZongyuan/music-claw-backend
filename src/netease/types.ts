export type NeteaseSearchQuery = {
  title: string
  artists: string[]
  album?: string
}

export type NeteaseCandidate = {
  id: number
  title: string
  artists: string[]
  album?: string
}

export type NeteaseSearchClient = {
  searchTracks: (query: NeteaseSearchQuery) => Promise<NeteaseCandidate[]>
}
