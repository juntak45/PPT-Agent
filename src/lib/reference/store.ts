import { promises as fs } from 'fs';
import path from 'path';
import { ReferenceProposal } from '../types';

const DATA_DIR = path.join(process.cwd(), 'data');
const REFERENCES_FILE = path.join(DATA_DIR, 'references.json');

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // directory already exists
  }
}

async function readFile(): Promise<ReferenceProposal[]> {
  try {
    const data = await fs.readFile(REFERENCES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeFile(references: ReferenceProposal[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(REFERENCES_FILE, JSON.stringify(references, null, 2), 'utf-8');
}

export async function getReferences(): Promise<ReferenceProposal[]> {
  return readFile();
}

export async function getReference(id: string): Promise<ReferenceProposal | null> {
  const references = await readFile();
  return references.find((r) => r.id === id) ?? null;
}

export async function addReference(ref: ReferenceProposal): Promise<void> {
  const references = await readFile();
  references.push(ref);
  await writeFile(references);
}

export async function removeReference(id: string): Promise<boolean> {
  const references = await readFile();
  const filtered = references.filter((r) => r.id !== id);
  if (filtered.length === references.length) return false;
  await writeFile(filtered);
  return true;
}
