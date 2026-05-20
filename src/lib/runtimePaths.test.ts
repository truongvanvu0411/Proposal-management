import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl, resolveManualUrl } from './runtimePaths';

describe('runtime paths', () => {
  it('uses same-origin api path on localhost', () => {
    expect(resolveApiBaseUrl({ hostname: 'localhost' }, 'http://localhost:4000/api')).toBe('/api');
    expect(resolveApiBaseUrl({ hostname: '127.0.0.1' }, 'https://api.cjp-demo.online/api')).toBe('/api');
  });

  it('falls back to same-origin api path when env points to localhost on deployed hosts', () => {
    expect(resolveApiBaseUrl({ hostname: 'cjp-demo.online' }, 'http://localhost:4000/api')).toBe('/api');
  });

  it('keeps explicit non-local api origins for deployed hosts', () => {
    expect(resolveApiBaseUrl({ hostname: 'cjp-demo.online' }, 'https://api.cjp-demo.online/api')).toBe(
      'https://api.cjp-demo.online/api',
    );
  });

  it('uses the manual html path', () => {
    expect(resolveManualUrl()).toBe('/manual.html');
  });
});
