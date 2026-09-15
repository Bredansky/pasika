/**
 * The failure a route answers with: the status the response carries, the message
 * a client reads, and what a failed upstream call answered with, so a module that
 * knows that upstream can name the reason and a log line can keep the body.
 */
export class HttpError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
    public readonly data: unknown = null,
  ) {
    super(message);
  }
}
