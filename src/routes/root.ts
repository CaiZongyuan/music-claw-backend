import type { Hono } from 'hono'

export const registerRootRoutes = (app: Hono) => {
  app.get('/', (c) => {
    return c.json({
      name: 'music-claw-backend',
      status: 'ok',
      version: 'v1',
    })
  })
}
