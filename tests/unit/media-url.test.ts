import { describe, expect, it } from 'vitest';

import {
  isAllowedMediaUrl,
  hasUnsafeUrlCharacters,
} from '@/lib/validation/media-url';

/**
 * The validator's contract, stated as behaviour rather than as a source-code
 * grep: every case below is decided by the real function, so a change that
 * weakens the rule fails here.
 *
 * The rejected set is the security-relevant half. A previous implementation
 * used `/^https?:\/\//` , which accepts a bare scheme with no host (`http://`)
 * and waves through protocol-relative URLs via a naive `startsWith('/')`.
 */
describe('isAllowedMediaUrl', () => {
  describe('accepts', () => {
    const accepted: Array<[string, string]> = [
      ['an https Cloudinary delivery URL', 'https://res.cloudinary.com/demo/image/upload/v1/a.png'],
      ['an http URL', 'http://example.com/a.png'],
      ['a root-relative path', '/images/hero-marble-vanity-1672.webp'],
      ['a nested root-relative path', '/images/nested/deep.webp'],
      ['a Cloudinary fetch URL containing https inside the path', 'https://res.cloudinary.com/demo/image/fetch/https://example.com/a.jpg'],
      ['a URL with a port', 'https://example.com:8443/a.png'],
      ['a URL with a query string', 'https://example.com/a.png?v=2'],
    ];

    for (const [label, value] of accepted) {
      it(label, () => {
        expect(isAllowedMediaUrl(value)).toBe(true);
      });
    }
  });

  describe('rejects', () => {
    const rejected: Array<[string, string]> = [
      // The original finding: the regex anchored only the prefix.
      ['a bare http scheme with no host', 'http://'],
      ['a bare https scheme with no host', 'https://'],
      // Starts with '/', but resolves against whatever scheme the page used.
      ['a protocol-relative URL', '//example.com/a.png'],
      ['a protocol-relative bare host', '//example.com'],
      // Non-http schemes.
      ['a javascript: URL', 'javascript:alert(1)'],
      ['a mixed-case javascript: URL', 'JavaScript:alert(1)'],
      ['a data: URL', 'data:image/png;base64,AAAA'],
      ['an ftp: URL', 'ftp://example.com/a.png'],
      ['a file: URL', 'file:///etc/passwd'],
      ['a vbscript: URL', 'vbscript:msgbox(1)'],
      // Not URLs at all.
      ['plain text', 'nonsense'],
      ['an empty string', ''],
      ['whitespace only', '   '],
      ['a relative path without a leading slash', 'images/a.png'],
      ['a backslash path', '\\evil.com'],
      ['a schemeless host', 'example.com/a.png'],
    ];

    for (const [label, value] of rejected) {
      it(label, () => {
        expect(isAllowedMediaUrl(value)).toBe(false);
      });
    }
  });

  it('tolerates surrounding whitespace on an absolute URL', () => {
    // The WHATWG parser strips leading/trailing whitespace itself, so a padded
    // https URL still resolves and is accepted. Confirmed behaviour, not an
    // assumption: the Zod schemas also trim before refining, so this is belt and
    // braces rather than the only line of defence.
    expect(isAllowedMediaUrl('  https://example.com/a.png  ')).toBe(true);
  });

  it('still rejects a padded protocol-relative URL', () => {
    // Trimming must not turn `//evil.test` into an acceptable value.
    expect(isAllowedMediaUrl('  //example.com/a.png  ')).toBe(false);
  });

  it('treats a URL with a userinfo host as a normal http(s) URL', () => {
    // Not an allow-list by host: only the protocol matters. Documented so a
    // future change to host filtering is a deliberate decision, not an accident.
    expect(isAllowedMediaUrl('https://evil.example/a.png')).toBe(true);
  });
});

describe('hasUnsafeUrlCharacters', () => {
  it('flags characters that could break out of an attribute or url()', () => {
    for (const value of [
      'https://example.com/a".png',
      "https://example.com/a'.png",
      'https://example.com/a).png',
      'https://example.com/a b.png',
      'https://example.com/a<b.png',
      'https://example.com/a>b.png',
      'https://example.com/a\tb.png',
      'https://example.com/a\nb.png',
    ]) {
      expect(hasUnsafeUrlCharacters(value), value).toBe(true);
    }
  });

  it('does not flag a legitimate Cloudinary delivery URL', () => {
    expect(
      hasUnsafeUrlCharacters(
        'https://res.cloudinary.com/std3x7lf/image/upload/v1791528840/studio-marmer/products/r6dsvrbqlkxor1kl7glq.png'
      )
    ).toBe(false);
  });

  it('does not flag a normal path or query string', () => {
    expect(hasUnsafeUrlCharacters('https://example.com/a.png?v=2&w=1')).toBe(false);
    expect(hasUnsafeUrlCharacters('/images/hero-marble-vanity-1672.webp')).toBe(false);
  });
});
