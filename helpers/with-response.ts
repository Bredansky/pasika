import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponseSchema, type ApiContract } from "./api-contract";
import { HttpError } from "./http-error";

const streamBody = z.custom<ReadableStream<Uint8Array>>((value) => value instanceof ReadableStream);

export type ResponseHeaders = Headers | Record<string, string>;

export type HandlerResult<TData> =
  | { data: TData; status?: number; headers?: ResponseHeaders }
  | { body: ReadableStream<Uint8Array>; status: number; headers?: ResponseHeaders };

type AnyHandler = (...args: unknown[]) => Promise<HandlerResult<unknown>>;

function missingHandler(): never {
  throw new HttpError("withResponse requires an API contract and a handler.", 500);
}

/**
 * Turns a handler result into the raw HTTP response described by one API contract.
 * Successful JSON data is validated and returned as the body directly. An HttpError
 * becomes the standard { message } error body at its own status and is never cached.
 * Anything else remains an error.
 */
export function withResponse<TSchema extends z.ZodType, Args extends unknown[]>(
  contract: ApiContract<TSchema, z.ZodType | undefined>,
  handler?: (...args: Args) => Promise<HandlerResult<z.input<TSchema>>>,
): (...args: Args) => Promise<NextResponse>;
export function withResponse<Args extends unknown[]>(
  handler: (...args: Args) => Promise<HandlerResult<ReadableStream<Uint8Array>>>,
): (...args: Args) => Promise<NextResponse>;
export function withResponse(
  contractOrHandler: ApiContract<z.ZodType, z.ZodType | undefined> | AnyHandler,
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

        const { data, status, headers } = result;
        return NextResponse.json(schema.parse(data), { status, headers });
      } catch (error) {
        if (error instanceof HttpError) {
          return NextResponse.json(apiErrorResponseSchema.parse({ message: error.message }), {
            status: error.status,
            headers: { "Cache-Control": "no-store" },
          });
        }

        throw error;
      }
    };

  return typeof contractOrHandler === "function"
    ? respond(streamBody, contractOrHandler)
    : respond(contractOrHandler.responseSchema, handler);
}
