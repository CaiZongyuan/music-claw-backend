import { Hono } from 'hono'

import { registerRootRoutes } from './routes/root'

export const app = new Hono()

registerRootRoutes(app)

export default app
