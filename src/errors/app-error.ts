export class AppError extends Error {
  code: string
  status: number
  details?: Record<string, unknown>

  constructor(
    code: string,
    message: string,
    status = 500,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = details
  }
}
