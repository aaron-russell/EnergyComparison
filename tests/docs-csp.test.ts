import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

const inlineScriptHashes = (html: string) => {
  const hashes = new Set<string>();
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (!/\bsrc\s*=/.test(match[1])) {
      hashes.add(createHash('sha256').update(match[2]).digest('base64'));
    }
  }
  return hashes;
};

describe('documentation CSP script hash extraction', () => {
  it('recognizes script end tags with optional whitespace', () => {
    const body = 'window.__docs = true;';
    expect(inlineScriptHashes(`<script>${body}</script >`)).toEqual(
      new Set([createHash('sha256').update(body).digest('base64')]),
    );
  });

  it('ignores external scripts', () => {
    expect(inlineScriptHashes('<script src="/docs/app.js"></script>')).toEqual(new Set());
  });
});
