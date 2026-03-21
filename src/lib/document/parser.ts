import mammoth from 'mammoth';

export async function parseDocument(
  buffer: Buffer,
  type: 'pdf' | 'docx' | 'pptx'
): Promise<string> {
  switch (type) {
    case 'docx':
      return parseDocx(buffer);
    case 'pdf':
      return parsePdf(buffer);
    case 'pptx':
      return parsePptx(buffer);
    default:
      throw new Error(`지원하지 않는 파일 형식: ${type}`);
  }
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function parsePdf(buffer: Buffer): Promise<string> {
  // Use pdfjs-dist legacy build for reliable PDF parsing in Node.js
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  const uint8 = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data: uint8 }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: { str: string }) => item.str)
      .filter((s: string) => s.trim().length > 0)
      .join(' ');
    pages.push(text);
  }
  doc.destroy();
  const result = pages.join('\n\n');
  console.log(`[PDF 파서] ${doc.numPages}페이지 파싱, 텍스트 총 ${result.length}자`);
  return result;
}

/**
 * Parse PPTX and return per-slide text as an array.
 * Each element is one slide's extracted text.
 */
function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export async function parsePptxSlides(buffer: Buffer): Promise<string[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => name.match(/^ppt\/slides\/slide\d+\.xml$/))
    .sort((a, b) => {
      // Natural sort: slide2 before slide10
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
      return numA - numB;
    });

  const texts: string[] = [];

  for (const slideFile of slideFiles) {
    const content = await zip.files[slideFile].async('string');
    // Use dotAll-capable regex (s flag) to match across newlines
    const matches = content.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g);
    if (matches) {
      const slideText = matches
        .map((m) => {
          const inner = m.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '');
          return decodeXmlEntities(inner).trim();
        })
        .filter(Boolean)
        .join(' ');
      texts.push(slideText);
    } else {
      texts.push('');
    }
  }

  console.log(`[PPTX 파서] ${slideFiles.length}장 파싱, 텍스트 총 ${texts.reduce((s, t) => s + t.length, 0)}자`);
  return texts;
}

async function parsePptx(buffer: Buffer): Promise<string> {
  const slides = await parsePptxSlides(buffer);
  return slides.join('\n\n');
}
