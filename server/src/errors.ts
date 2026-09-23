/** An error whose message is safe to show to the user. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string) => new AppError(400, message);
export const notFound = (what: string) => new AppError(404, `${what} not found.`);
export const conflict = (message: string) => new AppError(409, message);
export const forbidden = (message = "You don't have permission to do that.") => new AppError(403, message);
