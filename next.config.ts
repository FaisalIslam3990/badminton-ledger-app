import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @napi-rs/canvas is a native binary module (pulled in transitively by
  // pdf-parse -> pdfjs-dist for its DOMMatrix/ImageData/Path2D polyfills).
  // Next's server bundler can't inline a .node binary — without this it
  // silently drops the module, causing pdfjs-dist to crash with
  // "ReferenceError: DOMMatrix is not defined" at import time in
  // production (not reproducible locally, since dev/build use different
  // module loading than the deployed serverless bundle).
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "pdf-parse"],
};

export default nextConfig;
