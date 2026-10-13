import { describe, it, expect } from 'vitest';
import { safeUrl, logFormat } from '../../../src/server/config/logging.js';

describe('safeUrl', () => {
  it('leaves ordinary URLs alone', () => {
    expect(safeUrl('/api/media/library?type=Movie&page=2')).toBe('/api/media/library?type=Movie&page=2');
    expect(safeUrl('/api/version')).toBe('/api/version');
  });

  it('drops the query of playback proxy requests', () => {
    expect(safeUrl('/api/media/playback/proxy?path=%2Fvideos%2Fabc%2Fhls1%2Fmain%2F0.ts%3FPlaySessionId%3Dx'))
      .toBe('/api/media/playback/proxy?…');
  });

  it('masks secret parameters anywhere else', () => {
    expect(safeUrl('/x?api_key=secret&a=1')).toBe('/x?api_key=***&a=1');
    expect(safeUrl('/x?Token=abc')).toBe('/x?Token=***');
  });

  it('uses the safe URL in both log formats', () => {
    expect(logFormat('development')).toContain(':safe-url');
    expect(logFormat('production')).toContain(':safe-url');
    expect(logFormat('production')).not.toContain(':url');
  });
});
