import { promises as fs } from 'node:fs';
import path from 'node:path';

const POLICY_FILES = {
  terms: '이용약관.txt',
  privacy: '개인정보처리방침',
} as const;

async function resolvePolicyPath(filename: string): Promise<string> {
  const candidates = [
    path.join(process.cwd(), filename),
    path.join(process.cwd(), '..', '..', filename),
  ];
  for (const p of candidates) {
    try {
      await fs.access(p);
      return p;
    } catch {
      /* try next */
    }
  }
  throw new Error(`Policy file not found: ${filename} (cwd=${process.cwd()})`);
}

export async function readPolicyDocument(kind: keyof typeof POLICY_FILES): Promise<string> {
  const filePath = await resolvePolicyPath(POLICY_FILES[kind]);
  const content = await fs.readFile(filePath, 'utf8');
  return content.replace(/\r\n/g, '\n').trim();
}
