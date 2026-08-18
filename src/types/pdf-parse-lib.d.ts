// pdf-parse's package root (index.js) has debug-mode code gated on
// `!module.parent` that reads a test fixture PDF from disk — under a
// bundler that condition can evaluate true even when genuinely
// imported as a dependency, crashing at import time since the fixture
// doesn't exist in the deployed bundle. Importing the inner
// implementation directly (lib/pdf-parse.js) skips that wrapper
// entirely. @types/pdf-parse only declares the package root, so this
// fills in a minimal shape for the subpath import.
declare module "pdf-parse/lib/pdf-parse.js" {
  function pdfParse(dataBuffer: Buffer, options?: unknown): Promise<{ text: string }>;
  export default pdfParse;
}
