export type SearchParamsRecord = Record<
  string,
  string | string[] | undefined
>;

export type SearchParamsInput = SearchParamsRecord | URLSearchParams;

/**
 * Builds a URLSearchParams from a record or an existing URLSearchParams,
 * skipping empty values and any keys listed in `omit`.
 */
export function toURLSearchParams(
  input: SearchParamsInput,
  omit: readonly string[] = []
): URLSearchParams {
  const result = new URLSearchParams();

  if (input instanceof URLSearchParams) {
    input.forEach((value, key) => {
      if (omit.includes(key) || value === "") return;
      result.append(key, value);
    });
    return result;
  }

  for (const [key, value] of Object.entries(input)) {
    if (omit.includes(key) || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== "") result.append(key, item);
      }
    } else if (value !== "") {
      result.append(key, value);
    }
  }
  return result;
}
