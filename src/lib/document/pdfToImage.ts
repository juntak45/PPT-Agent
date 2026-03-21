import * as pdfjs from 'pdfjs-dist';
import { createCanvas } from '@napi-rs/canvas';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Node.js canvas factory for pdfjs-dist rendering.
 * Uses @napi-rs/canvas (pre-built Rust binaries, no native compilation needed).
 *
 * A "canvas" shim in node_modules re-exports @napi-rs/canvas so that
 * pdfjs-dist's internal require("canvas") resolves correctly.
 * See scripts/canvas-shim.js for details.
 */
class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return { canvas, context };
  }

  reset(canvasAndContext: any, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(_canvasAndContext: any) {
    // no-op
  }
}

/**
 * Convert PDF pages to JPEG image buffers.
 * @param buffer - PDF file buffer
 * @param maxPages - Maximum number of pages to convert
 * @param scale - Render scale (1.0 = 72dpi, 2.0 = 144dpi). Lower = smaller images, faster.
 * @returns Array of { page, jpeg } objects
 */
export async function pdfPagesToImages(
  buffer: Buffer,
  maxPages = 20,
  scale = 1.5
): Promise<Array<{ page: number; jpeg: Buffer }>> {
  const data = new Uint8Array(buffer);
  const factory = new NodeCanvasFactory();
  const doc = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
    verbosity: 0,
    canvasFactory: factory as any,
  }).promise;

  const totalPages = Math.min(doc.numPages, maxPages);
  console.log(`[PDF→Image] ${doc.numPages}페이지 중 ${totalPages}페이지 변환 (scale=${scale})`);

  const results: Array<{ page: number; jpeg: Buffer }> = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvasAndContext = factory.create(viewport.width, viewport.height);

    await (page as any).render({
      canvasContext: canvasAndContext.context,
      viewport,
      canvasFactory: factory,
    }).promise;

    const jpegBuf = (canvasAndContext.canvas as any).toBuffer('image/jpeg', 75);
    results.push({ page: i, jpeg: Buffer.from(jpegBuf) });

    if (i % 5 === 0) {
      console.log(`[PDF→Image] ${i}/${totalPages} 변환 완료`);
    }
  }

  console.log(`[PDF→Image] 전체 변환 완료: ${results.length}페이지, 총 ${(results.reduce((s, r) => s + r.jpeg.length, 0) / 1024 / 1024).toFixed(1)}MB`);
  return results;
}
