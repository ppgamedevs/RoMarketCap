declare module "papaparse" {
  type ParseError = { message: string };
  type ParseResult<T> = { data: T[]; errors: ParseError[] };
  type ParseConfig = { header?: boolean; skipEmptyLines?: boolean };
  const Papa: {
    parse<T = unknown>(input: string, config: ParseConfig): ParseResult<T>;
  };
  export default Papa;
}


