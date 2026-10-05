import { z, type ZodType } from "zod";
import type { HttpMethod } from "./http-method";

export const apiErrorResponseSchema = z.object({
  message: z.string(),
});

interface ApiContractBase<TResponseSchema extends ZodType> {
  readonly method: HttpMethod;
  readonly path: string;
  readonly responseSchema: TResponseSchema;
}

export type ApiContract<
  TResponseSchema extends ZodType = ZodType,
  TRequestSchema extends ZodType | undefined = undefined,
> = ApiContractBase<TResponseSchema> &
  (TRequestSchema extends ZodType
    ? { readonly requestSchema: TRequestSchema }
    : { readonly requestSchema?: undefined });

/**
 * Declares one schema-validated JSON endpoint. Route, client, and mock import
 * this same value so method, path, request validation, and response validation
 * have one source.
 */
export function defineApiContract<
  TResponseSchema extends ZodType,
  TRequestSchema extends ZodType | undefined = undefined,
>(contract: ApiContract<TResponseSchema, TRequestSchema>): Readonly<ApiContract<TResponseSchema, TRequestSchema>> {
  return Object.freeze({ ...contract });
}
