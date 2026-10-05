/**
 * Marks an object literal as an intentional semantic mapping between contracts.
 *
 * Pasika allows naming-convention translations such as snake_case to camelCase
 * without this helper. Use this identity helper only when source and target
 * fields intentionally use different semantic names.
 */
export function defineContractMapping<const Mapping>(mapping: Mapping): Mapping {
  return mapping;
}
