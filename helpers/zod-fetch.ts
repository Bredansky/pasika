import { z, type ZodType } from "zod";
import { apiErrorResponseSchema, type ApiContract } from "./api-contract";
import { HttpError } from "./http-error";

const streamBody = z.custom<ReadableStream<Uint8Array>>((value) => value instanceof ReadableStream);
const BAD_GATEWAY = 502;

export interface ApiContractFetchOptions<
  TResponseSchema extends ZodType,
  TRequestSchema extends ZodType | undefined = undefined,
> {
  contract: ApiContract<TResponseSchema, TRequestSchema>;
  url?: string | URL;
  init?: Omit<RequestInit, "method">;
}

export interface ZodFetchRelayedOptions {
  url: string | URL;
  init?: RequestInit;
}

export interface ZodFetchRelayedResponse {
  body: ReadableStream<Uint8Array>;
  status: number;
  headers: Headers;
}

function decodeFailureBody(body: string): unknown {
  try {
    const parsed: unknown = JSON.parse(body);
    return parsed;
  } catch {
    return body;
  }
}

function failureMessage(status: number, statusText: string, body: unknown): string {
  const parsed = apiErrorResponseSchema.safeParse(body);
  if (parsed.success) return parsed.data.message;

  const suffix = statusText === "" ? "" : ` ${statusText}`;
  return `Request failed with status ${String(status)}${suffix}`;
}

function parseRequestBody(schema: ZodType | undefined, body: RequestInit["body"]): void {
  if (schema === undefined) return;
  const decoded: unknown = typeof body === "string" ? JSON.parse(body) : body;
  schema.parse(decoded);
}

/**
 * Makes one schema-validated JSON request through an API contract, or relays a
 * response body when no contract is supplied. Contract calls reuse the endpoint's
 * method, request schema, and response schema; url only overrides the concrete
 * address for dynamic or external endpoints.
 */
export function zodFetch<TResponseSchema extends ZodType, TRequestSchema extends ZodType | undefined>(
  options: ApiContractFetchOptions<TResponseSchema, TRequestSchema>,
): Promise<z.output<TResponseSchema>>;
export function zodFetch(options: ZodFetchRelayedOptions): Promise<ZodFetchRelayedResponse>;
export async function zodFetch(
  options: ApiContractFetchOptions<ZodType, ZodType | undefined> | ZodFetchRelayedOptions,
): Promise<unknown> {
  const contract = "contract" in options ? options.contract : undefined;
  const url: string | URL = "contract" in options ? (options.url ?? options.contract.path) : options.url;
  const init = contract ? { ...options.init, method: contract.method } : options.init;

  if (contract) parseRequestBody(contract.requestSchema, init?.body);

  const response = await fetch(url, init);

  if (!response.ok) {
    const body = decodeFailureBody(await response.text());
    throw new HttpError(failureMessage(response.status, response.statusText, body), response.status, body);
  }

  if (!contract) {
    const streamed = streamBody.safeParse(response.body);
    if (!streamed.success) {
      throw new HttpError("The upstream answered without a body to relay.", BAD_GATEWAY);
    }
    return { body: streamed.data, status: response.status, headers: response.headers };
  }

  const body = await response.text();
  if (body === "") {
    const absent = contract.responseSchema.safeParse(undefined);
    if (absent.success) return absent.data;
    throw new HttpError("The upstream answered without a body to decode.", BAD_GATEWAY);
  }

  const decoded: unknown = JSON.parse(body);
  return contract.responseSchema.parse(decoded);
}
