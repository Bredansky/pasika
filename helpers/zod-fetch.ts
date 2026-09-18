import { z, type ZodType } from "zod";
import { HttpError } from "./http-error";

/** A body this helper hands on is one a caller relays, so it is held to a contract like any other. */
const streamBody = z.custom<ReadableStream<Uint8Array>>((value) => value instanceof ReadableStream);

export interface ZodFetchOptions<TSchema extends ZodType = never, TRequestSchema extends ZodType = ZodType> {
  url: string | URL;
  init?: RequestInit;
  requestSchema?: TRequestSchema;
  responseSchema?: TSchema;
}

/** The response itself, for a caller whose own response relays a body nothing has read. */
export interface ZodFetchRelayedResponse {
  body: ReadableStream<Uint8Array>;
  status: number;
  headers: Headers;
}

/**
 * The status a body the helper cannot hand on leaves with. The upstream answered at
 * a success status, so the failure is this gateway's: it could not relay what it got,
 * and a 2xx carrying `{ data: null, message }` would read as a success to its caller.
 */
const BAD_GATEWAY = 502;

/** A body that is not JSON stays the text the upstream sent it as. */
function decodeFailureBody(body: string): unknown {
  try {
    const parsed: unknown = JSON.parse(body);
    return parsed;
  } catch {
    return body;
  }
}

/**
 * The only module in a repository that calls `fetch`. It hands a JSON body back as
 * data the response schema accepted, and a failure back as an `HttpError` carrying
 * the status the upstream reported, the message for a client, and what the upstream
 * answered with. A call that names no response schema gets the response itself.
 *
 * A success that carries no body is the schema's call: one that allows its data to
 * be absent, such as `z.undefined()` for an endpoint answering `204`, accepts it, and
 * one that does not makes it a failure of this gateway's own, a 502.
 */
export function zodFetch<TSchema extends ZodType>(
  options: ZodFetchOptions<TSchema> & { responseSchema: TSchema },
): Promise<z.output<TSchema>>;
export function zodFetch(options: ZodFetchOptions): Promise<ZodFetchRelayedResponse>;
export async function zodFetch(options: ZodFetchOptions<ZodType>): Promise<unknown> {
  if (options.requestSchema !== undefined) {
    const rawBody = options.init?.body;
    const body: unknown = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    options.requestSchema.parse(body);
  }

  const response = await fetch(options.url, options.init);

  if (!response.ok) {
    const body = await response.text();
    const statusText = response.statusText === "" ? "" : ` ${response.statusText}`;

    throw new HttpError(
      `Request failed with status ${String(response.status)}${statusText}`,
      response.status,
      decodeFailureBody(body),
    );
  }

  if (options.responseSchema === undefined) {
    const streamed = streamBody.safeParse(response.body);

    if (!streamed.success) {
      throw new HttpError("The upstream answered without a body to relay.", BAD_GATEWAY);
    }

    return { body: streamed.data, status: response.status, headers: response.headers };
  }

  const body = await response.text();

  if (body === "") {
    const absent = options.responseSchema.safeParse(undefined);

    if (absent.success) return absent.data;

    throw new HttpError("The upstream answered without a body to decode.", BAD_GATEWAY);
  }

  const decoded: unknown = JSON.parse(body);
  const responseEnvelopeSchema = z.object({
    data: options.responseSchema,
    message: z.string(),
  });

  return responseEnvelopeSchema.parse(decoded).data;
}
