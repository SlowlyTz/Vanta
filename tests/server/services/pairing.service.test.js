import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/server/config/env.js', () => ({ default: { JELLYFIN_BASE_URL: 'http://jellyfin.test' } }));
const { createPairingService, MAX_OPEN_PER_IP, MAX_OPEN_TOTAL, PAIRING_TTL_MS } = await import('../../../src/server/services/pairing.service.js');

const setup = () => {
  let time = 0;
  let codes = 100000;
  const auth = {
    quickConnectInitiate: vi.fn(async deviceId => ({ Secret: `secret-${deviceId}`, Code: '999999' })),
    quickConnectAuthorize: vi.fn(async () => true),
    quickConnectLogin: vi.fn(async () => ({ AccessToken: 'tv-token', User: { Id: 'u1', Name: 'alice' } }))
  };
  const service = createPairingService({ auth, now: () => time, randomCode: () => String(codes++), randomToken: () => `tok-${codes}` });
  return { service, auth, advance: ms => { time += ms; } };
};

describe('PairingService', () => {
  it('pairs a TV once the phone confirmed its code, and only once', async () => {
    const { service, auth } = setup();
    const tv = await service.start({ ip: '1.1.1.1', userAgent: 'Tizen TV' });
    expect(tv.code).toBe('100000');
    expect(service.status(tv.token).state).toBe('waiting');
    expect(service.lookup('100000').userAgent).toBe('Tizen TV');

    await service.confirm('100000', { id: 'u1', name: 'alice', token: 'phone-token' });
    expect(auth.quickConnectAuthorize).toHaveBeenCalledWith('999999', { token: 'phone-token', userId: 'u1' });
    expect(service.status(tv.token).state).toBe('confirmed');

    const { data, deviceId } = await service.finish(tv.token);
    expect(data.AccessToken).toBe('tv-token');
    expect(auth.quickConnectLogin).toHaveBeenCalledWith(`secret-${deviceId}`, { deviceId });
    expect(service.status(tv.token).state).toBe('expired');
    await expect(service.confirm('100000', { id: 'u2' })).rejects.toMatchObject({ status: 404 });
  });

  it('lets codes run out after five minutes', async () => {
    const { service, advance } = setup();
    const tv = await service.start({ ip: '1.1.1.1' });
    advance(PAIRING_TTL_MS);
    expect(service.lookup(tv.code)).toBeNull();
    expect(service.status(tv.token).state).toBe('expired');
  });

  it('refuses a second confirmation and signing in before it', async () => {
    const { service } = setup();
    const tv = await service.start({ ip: '1.1.1.1' });
    await expect(service.finish(tv.token)).rejects.toMatchObject({ status: 409 });
    await service.confirm(tv.code, { id: 'u1' });
    await expect(service.confirm(tv.code, { id: 'u2' })).rejects.toMatchObject({ status: 409 });
  });

  it('allows at most ten open codes per address', async () => {
    const { service } = setup();
    for (let i = 0; i < MAX_OPEN_PER_IP; i++) await service.start({ ip: '2.2.2.2' });
    await expect(service.start({ ip: '2.2.2.2' })).rejects.toMatchObject({ status: 429 });
    await expect(service.start({ ip: '3.3.3.3' })).resolves.toBeTruthy();
  });

  it('allows only so many open codes overall', async () => {
    const { service } = setup();
    for (let i = 0; i < MAX_OPEN_TOTAL; i++) await service.start({ ip: `10.0.${Math.floor(i / 10)}.${i % 10}` });
    await expect(service.start({ ip: '9.9.9.9' })).rejects.toMatchObject({ status: 503 });
  });

  it('keeps a confirmed code when the sign-in fails, so the next poll can retry', async () => {
    const { service, auth } = setup();
    const tv = await service.start({ ip: '1.1.1.1' });
    await service.confirm(tv.code, { id: 'u1', token: 'phone-token' });
    auth.quickConnectLogin.mockRejectedValueOnce(Object.assign(new Error('down'), { status: 504 }));
    await expect(service.finish(tv.token)).rejects.toMatchObject({ status: 504 });
    expect(service.status(tv.token).state).toBe('confirmed');
    await expect(service.finish(tv.token)).resolves.toMatchObject({ data: { AccessToken: 'tv-token' } });
    expect(service.status(tv.token).state).toBe('expired');
  });

  it('signs in once even when the TV asks twice at the same time', async () => {
    const { service, auth } = setup();
    const tv = await service.start({ ip: '1.1.1.1' });
    await service.confirm(tv.code, { id: 'u1', token: 'phone-token' });
    const first = service.finish(tv.token);
    expect(service.status(tv.token).state).toBe('signing-in');
    await expect(service.finish(tv.token)).rejects.toMatchObject({ status: 409 });
    await first;
    expect(auth.quickConnectLogin).toHaveBeenCalledTimes(1);
  });

  it('says so when Quick Connect is off', async () => {
    const { service, auth } = setup();
    auth.quickConnectInitiate.mockRejectedValue(Object.assign(new Error('x'), { status: 401 }));
    await expect(service.start({ ip: '1.1.1.1' })).rejects.toMatchObject({ status: 409, code: 'QUICK_CONNECT_DISABLED' });
  });
});
