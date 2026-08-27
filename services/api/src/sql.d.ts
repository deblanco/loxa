/** schema.sql is imported as text by the test suite; Vite resolves `?raw`. */
declare module '*.sql?raw' {
  const contents: string;
  export default contents;
}
