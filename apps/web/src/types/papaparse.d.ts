declare module 'papaparse' {
  export interface ParseResult<T> {
    data: T[];
    errors: Array<{ row: number; type: string; message: string }>;
    meta: { delimiter: string; linebreak: string; truncated: boolean; cursor: number };
  }
  export function parse<T = string[]>(
    input: string,
    options?: { header?: boolean; skipEmptyLines?: boolean }
  ): ParseResult<T>;
  const Papa: { parse: typeof parse };
  export default Papa;
}
