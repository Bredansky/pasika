import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError } from "./http-error";

/** A body handed to the response is one the JSON envelope cannot hold. */
const streamBody = z.custom<ReadableStream<Uint8Array>>((value) => value instanceof ReadableStream);

/** Whatever a handler's own response needs to carry; a failure never inherits it. */
export type ResponseHeaders = Headers | Record<string, string>;

export type HandlerResult<TData> =
  | { message: string; data: TData; status?: number; headers?: ResponseHeaders }
  | { body: ReadableStream<Uint8Array>; status: number; headers?: ResponseHeaders };

type AnyHandler = (...args: unknown[]) => Promise<HandlerResult<unknown>>;

/** The answer to a call that names a response schema and no handler beside it. */
function missingHandler(): never {
  throw new HttpError("withResponse requires a response schema and a handler.", 500);
}

/**
 * Turns a handler's result, or a failure thrown under it, into a response: the data
 * goes through the response schema, an `HttpError` becomes `{ data: null, message }`
 * at its own status and is never cached, and anything else stays an error.
 *
 * A handler whose own response is not JSON calls it with the handler alone and returns
 * `{ body, status, headers }`, so a relayed body passes through unread.
 */
export function withResponse<TSchema extends z.ZodType, Args extends unknown[]>(
  responseSchema: TSchema,
  handler?: (...args: Args) => Promise<HandlerResult<z.input<TSchema>>>,
): (...args: Args) => Promise<NextResponse>;
export function withResponse<Args extends unknown[]>(
  handler: (...args: Args) => Promise<HandlerResult<ReadableStream<Uint8Array>>>,
): (...args: Args) => Promise<NextResponse>;
export function withResponse(
  responseSchemaOrHandler: z.ZodType | AnyHandler,
  handler?: AnyHandler,
): (...args: unknown[]) => Promise<NextResponse> {
  const respond =
    (schema: z.ZodType, wrapped: AnyHandler = missingHandler) =>
    async (...requestArgs: unknown[]): Promise<NextResponse> => {
      try {
        const result = await wrapped(...requestArgs);

        if ("body" in result) {
          const { body, status, headers } = result;
          return new NextResponse(streamBody.parse(body), { status, headers });
        }

        const { message, data, status, headers } = result;
        return NextResponse.json({ data: schema.parse(data), message }, { status, headers });
      } catch (error) {
        if (error instanceof HttpError) {
          return NextResponse.json(
            { data: null, message: error.message },
            { status: error.status, headers: { "Cache-Control": "no-store" } },
          );
        }

        throw error;
      }
    };

  // A function in the schema slot is the handler-only call, whose result carries
  // the body JSON cannot.
  return typeof responseSchemaOrHandler === "function"
    ? respond(streamBody, responseSchemaOrHandler)
    : respond(responseSchemaOrHandler, handler);
}
