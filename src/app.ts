import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { AppError } from './errors/app-error'
import {
  NeteaseCloudMusicPlaylistClient,
  NeteaseCloudMusicSearchClient,
} from './netease/netease-cloud-music-clients'
import { NeteaseMatchingService } from './netease/netease-matching-service'
import { NeteasePlaylistImportService } from './netease/netease-playlist-import-service'
import { FetchQqPlaylistClient } from './qq/fetch-qq-playlist-client'
import { FetchQqShareUrlResolver } from './qq/fetch-qq-share-url-resolver'
import { QqPlaylistService } from './qq/qq-playlist-service'
import { ConflictReviewService } from './review/conflict-review-service'
import { registerApiRoutes } from './routes/api'
import { registerRootRoutes } from './routes/root'
import { registerVerifyRoutes } from './routes/verify'

export type AppServices = {
  qqPlaylistService: QqPlaylistService
  neteaseMatchingService: NeteaseMatchingService
  conflictReviewService: ConflictReviewService
  neteasePlaylistImportService: NeteasePlaylistImportService
}

const createDefaultServices = (): AppServices => {
  return {
    conflictReviewService: new ConflictReviewService(),
    neteaseMatchingService: new NeteaseMatchingService(
      new NeteaseCloudMusicSearchClient()
    ),
    neteasePlaylistImportService: new NeteasePlaylistImportService(
      new NeteaseCloudMusicPlaylistClient()
    ),
    qqPlaylistService: new QqPlaylistService(
      new FetchQqPlaylistClient(),
      new FetchQqShareUrlResolver()
    ),
  }
}

export const createApp = (services: Partial<AppServices> = {}) => {
  const resolvedServices = {
    ...createDefaultServices(),
    ...services,
  }
  const app = new Hono()

  app.use('/api/*', cors())

  app.onError((error, c) => {
    const normalizedError =
      error instanceof AppError
        ? error
        : new AppError('INTERNAL_SERVER_ERROR', 'Unexpected server error', 500)

    return c.newResponse(
      JSON.stringify({
        error: {
          code: normalizedError.code,
          ...(normalizedError.details
            ? { details: normalizedError.details }
            : {}),
          message: normalizedError.message,
        },
      }),
      normalizedError.status as never,
      {
        'content-type': 'application/json; charset=utf-8',
      }
    )
  })

  registerRootRoutes(app)
  registerApiRoutes(app, resolvedServices)
  registerVerifyRoutes(app)

  return app
}

export const app = createApp()

export default app
