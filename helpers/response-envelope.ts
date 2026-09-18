import { z } from "zod";

export function responseEnvelope<TSchema extends z.ZodType>(
  dataSchema: TSchema,
): z.ZodType<
  { success: true; data: z.output<TSchema> } | { success: false; data: null; message: string },
  { success: true; data: z.input<TSchema> } | { success: false; data: null; message: string }
>;
export function responseEnvelope(dataSchema: z.ZodType): z.ZodType;
export function responseEnvelope(dataSchema: z.ZodType): z.ZodType {
  return z.discriminatedUnion("success", [
    z.object({
      success: z.literal(true),
      data: dataSchema,
    }),
    z.object({
      success: z.literal(false),
      data: z.null(),
      message: z.string(),
    }),
  ]);
}
