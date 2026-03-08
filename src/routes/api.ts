import type { Hono } from 'hono'

import type { AppServices } from '../app'
import { AppError } from '../errors/app-error'
import type {
  ConflictCategory,
  ImportQueueItem,
  NormalizedTrack,
  TrackMatchResult,
} from '../types/music'

const CONFLICT_CATEGORIES: ConflictCategory[] = [
  'metadata_insufficient',
  'multiple_candidates',
  'unmatched',
]

export const registerApiRoutes = (app: Hono, services: AppServices) => {
  app.post('/api/qq/parse', async (c) => {
    const body = await readJsonBody(c.req)
    const shareUrl = requireString(body.shareUrl, 'shareUrl')
    const pageSize = optionalPositiveInteger(body.pageSize, 'pageSize')

    const result = await services.qqPlaylistService.parsePlaylist(shareUrl, {
      ...(pageSize ? { pageSize } : {}),
    })

    return c.json(result)
  })

  app.post('/api/netease/match', async (c) => {
    const body = await readJsonBody(c.req)
    const tracks = requireArray<NormalizedTrack>(body.tracks, 'tracks')
    const page = optionalPositiveInteger(body.page, 'page')
    const pageSize = optionalPositiveInteger(body.pageSize, 'pageSize')

    const result = await services.neteaseMatchingService.matchTracks(tracks, {
      ...(page ? { page } : {}),
      ...(pageSize ? { pageSize } : {}),
    })

    return c.json(result)
  })

  app.post('/api/review/session', async (c) => {
    const body = await readJsonBody(c.req)
    const playlistId = requireString(body.playlistId, 'playlistId')
    const matchResults = requireArray<TrackMatchResult>(
      body.matchResults,
      'matchResults'
    )

    const result = services.conflictReviewService.createSession(
      playlistId,
      matchResults
    )

    return c.json(result, 201)
  })

  app.get('/api/review/:sessionId/conflicts', (c) => {
    const sessionId = c.req.param('sessionId')
    const category = c.req.query('category')
    const page = optionalPositiveInteger(c.req.query('page'), 'page')
    const pageSize = optionalPositiveInteger(c.req.query('pageSize'), 'pageSize')

    if (!category || !CONFLICT_CATEGORIES.includes(category as ConflictCategory)) {
      throw new AppError(
        'INVALID_CONFLICT_CATEGORY',
        'Conflict category must be one of metadata_insufficient, multiple_candidates, or unmatched',
        400,
        {
          category,
        }
      )
    }

    return c.json(
      services.conflictReviewService.getConflictPage(sessionId, {
        category: category as ConflictCategory,
        ...(page ? { page } : {}),
        ...(pageSize ? { pageSize } : {}),
      })
    )
  })

  app.post('/api/review/:sessionId/select', async (c) => {
    const sessionId = c.req.param('sessionId')
    const body = await readJsonBody(c.req)
    const trackId = requireString(body.trackId, 'trackId')
    const candidateId = requirePositiveInteger(body.candidateId, 'candidateId')

    services.conflictReviewService.selectCandidate(sessionId, trackId, candidateId)

    return c.json({ ok: true })
  })

  app.post('/api/review/:sessionId/skip', async (c) => {
    const sessionId = c.req.param('sessionId')
    const body = await readJsonBody(c.req)
    const trackId = requireString(body.trackId, 'trackId')

    services.conflictReviewService.skipTrack(sessionId, trackId)

    return c.json({ ok: true })
  })

  app.post('/api/review/:sessionId/defer', async (c) => {
    const sessionId = c.req.param('sessionId')
    const body = await readJsonBody(c.req)
    const trackId = requireString(body.trackId, 'trackId')

    services.conflictReviewService.deferTrack(sessionId, trackId)

    return c.json({ ok: true })
  })

  app.get('/api/review/:sessionId/import-queue', (c) => {
    const sessionId = c.req.param('sessionId')

    return c.json(services.conflictReviewService.getImportQueue(sessionId))
  })

  app.post('/api/import', async (c) => {
    const body = await readJsonBody(c.req)
    const cookie = requireString(body.cookie, 'cookie')
    const playlistName = requireString(body.playlistName, 'playlistName')
    const items = requireArray<ImportQueueItem>(body.items, 'items')
    const batchSize = optionalPositiveInteger(body.batchSize, 'batchSize')

    const result = await services.neteasePlaylistImportService.importPlaylist({
      batchSize,
      cookie,
      items,
      playlistName,
    })

    return c.json(result)
  })
}

const readJsonBody = async (request: { json: () => Promise<unknown> }) => {
  const body = await request.json()

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(
      'INVALID_REQUEST_BODY',
      'Request body must be a JSON object',
      400
    )
  }

  return body as Record<string, unknown>
}

const requireString = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(
      'INVALID_REQUEST_BODY',
      `${field} is required`,
      400,
      {
        field,
      }
    )
  }

  return value
}

const requireArray = <T>(value: unknown, field: string) => {
  if (!Array.isArray(value)) {
    throw new AppError(
      'INVALID_REQUEST_BODY',
      `${field} must be an array`,
      400,
      {
        field,
      }
    )
  }

  return value as T[]
}

const optionalPositiveInteger = (value: unknown, field: string) => {
  if (value === undefined) {
    return undefined
  }

  return requirePositiveInteger(value, field)
}

const requirePositiveInteger = (value: unknown, field: string) => {
  const parsedValue = typeof value === 'string' ? Number(value) : value

  if (
    typeof parsedValue !== 'number' ||
    !Number.isInteger(parsedValue) ||
    parsedValue <= 0
  ) {
    throw new AppError(
      'INVALID_REQUEST_BODY',
      `${field} must be a positive integer`,
      400,
      {
        field,
      }
    )
  }

  return parsedValue
}
