import { STRUCTURED_DATA_START, STRUCTURED_DATA_END } from '../constants';
import { StructuredData } from '../types';

export function extractStructuredData(text: string): StructuredData | null {
  const startIdx = text.indexOf(STRUCTURED_DATA_START);
  if (startIdx === -1) return null;

  const jsonStart = startIdx + STRUCTURED_DATA_START.length;
  const endIdx = text.indexOf(STRUCTURED_DATA_END, jsonStart);
  if (endIdx === -1) return null;

  const jsonStr = text.slice(jsonStart, endIdx).trim();

  try {
    return JSON.parse(jsonStr) as StructuredData;
  } catch {
    return null;
  }
}

export function removeStructuredData(text: string): string {
  const startIdx = text.indexOf(STRUCTURED_DATA_START);
  if (startIdx === -1) return text;

  const endIdx = text.indexOf(STRUCTURED_DATA_END, startIdx);
  if (endIdx === -1) return text;

  return (text.slice(0, startIdx) + text.slice(endIdx + STRUCTURED_DATA_END.length)).trim();
}
