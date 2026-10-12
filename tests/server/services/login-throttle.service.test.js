import { describe, it, expect } from 'vitest';
import { createLoginThrottle, formatLockDuration } from '../../../src/server/services/login-throttle.service.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function setup(options = {}) {
  let time = 1_000_000;
  const throttle = createLoginThrottle({ now: () => time, ...options });
  return {
    throttle,
    advance: (ms) => { time += ms; },
    failThree: (ip = '1.2.3.4', user = 'alice') => {
      throttle.recordFailure(ip, user);
      throttle.recordFailure(ip, user);
      return throttle.recordFailure(ip, user);
    }
  };
}

describe('login throttle', () => {
  it('lets two failures through and locks for a minute on the third', () => {
    const { throttle } = setup();
    expect(throttle.recordFailure('1.2.3.4', 'alice')).toBe(0);
    expect(throttle.recordFailure('1.2.3.4', 'alice')).toBe(0);
    expect(throttle.check('1.2.3.4', 'alice')).toBe(0);
    expect(throttle.recordFailure('1.2.3.4', 'alice')).toBe(MINUTE);
    expect(throttle.check('1.2.3.4', 'alice')).toBe(MINUTE);
  });

  it('doubles the lock with every further three failures, up to 24 hours', () => {
    const { throttle, advance, failThree } = setup();
    const locks = [];
    for (let i = 0; i < 13; i++) {
      const lock = failThree();
      locks.push(lock);
      advance(lock);
      expect(throttle.check('1.2.3.4', 'alice')).toBe(0);
    }
    expect(locks.slice(0, 5)).toEqual([MINUTE, 2 * MINUTE, 4 * MINUTE, 8 * MINUTE, 16 * MINUTE]);
    expect(Math.max(...locks)).toBe(DAY);
    expect(locks.at(-1)).toBe(DAY);
  });

  it('forgets everything after a day without failures', () => {
    const { throttle, advance, failThree } = setup();
    failThree();
    advance(MINUTE);
    failThree();
    advance(2 * MINUTE + DAY - 1);
    expect(failThree()).toBe(4 * MINUTE);
    advance(4 * MINUTE + DAY);
    expect(failThree()).toBe(MINUTE);
    expect(throttle.check('1.2.3.4', 'alice')).toBe(MINUTE);
  });

  it('starts over after a successful login', () => {
    const { throttle, advance, failThree } = setup();
    failThree();
    advance(MINUTE);
    throttle.recordSuccess('1.2.3.4', 'ALICE');
    expect(failThree()).toBe(MINUTE);
  });

  it('counts per address and username, ignoring case and spaces', () => {
    const { throttle, failThree } = setup();
    failThree('1.2.3.4', ' Alice');
    expect(throttle.check('1.2.3.4', 'alice')).toBe(MINUTE);
    expect(throttle.check('5.6.7.8', 'alice')).toBe(0);
    expect(throttle.check('1.2.3.4', 'bob')).toBe(0);
  });

  it('locks an address that tries many usernames', () => {
    const { throttle } = setup({ ipAttemptsPerLock: 5 });
    for (let i = 0; i < 4; i++) expect(throttle.recordFailure('1.2.3.4', `user${i}`)).toBe(0);
    expect(throttle.recordFailure('1.2.3.4', 'user4')).toBe(MINUTE);
    expect(throttle.check('1.2.3.4', 'someone-new')).toBe(MINUTE);
    expect(throttle.check('9.9.9.9', 'someone-new')).toBe(0);
  });

  it('keeps its memory bounded', () => {
    const { throttle } = setup({ maxEntries: 50 });
    for (let i = 0; i < 200; i++) throttle.recordFailure(`10.0.0.${i}`, 'x');
    expect(throttle.size()).toBeLessThanOrEqual(50);
  });
});

describe('formatLockDuration', () => {
  it('rounds up to full minutes in German', () => {
    expect(formatLockDuration(1)).toBe('1 Minute');
    expect(formatLockDuration(MINUTE)).toBe('1 Minute');
    expect(formatLockDuration(61 * 1000)).toBe('2 Minuten');
    expect(formatLockDuration(HOUR)).toBe('1 Stunde');
    expect(formatLockDuration(HOUR + 4 * MINUTE)).toBe('1 Stunde 4 Minuten');
    expect(formatLockDuration(DAY)).toBe('24 Stunden');
  });
});

describe('loginThrottle stats', () => {
  it('counts logins, failures and locks since the start', () => {
    let time = 0;
    const throttle = createLoginThrottle({ now: () => time, attemptsPerLock: 2, ipAttemptsPerLock: 100 });
    throttle.recordSuccess('1.1.1.1', 'a');
    throttle.recordFailure('1.1.1.1', 'b');
    throttle.recordFailure('1.1.1.1', 'b');
    expect(throttle.stats()).toEqual({ successes: 1, failures: 2, locks: 1, activeLocks: 1 });
    time += 24 * 60 * 60 * 1000;
    expect(throttle.stats().activeLocks).toBe(0);
  });
});
