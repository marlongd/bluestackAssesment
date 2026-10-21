import { getPort } from './config';

describe('getPort', () => {
  const originalPort = process.env.PORT;

  afterEach(() => {
    if (originalPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = originalPort;
    }
  });

  it('defaults to 3000 when PORT is unset', () => {
    delete process.env.PORT;

    expect(getPort()).toBe(3000);
  });

  it('parses a valid PORT', () => {
    process.env.PORT = '8123';

    expect(getPort()).toBe(8123);
  });

  it('rejects a non-numeric PORT', () => {
    process.env.PORT = 'not-a-port';

    expect(() => getPort()).toThrow(/Invalid PORT/);
  });

  it('rejects an out-of-range PORT', () => {
    process.env.PORT = '70000';

    expect(() => getPort()).toThrow(/Invalid PORT/);
  });
});
