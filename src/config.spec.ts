import { getBodyLimit, getDatabasePath, getPort, SERVICE_NAME } from './config';

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

describe('getDatabasePath', () => {
  const original = process.env.DATABASE_PATH;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DATABASE_PATH;
    } else {
      process.env.DATABASE_PATH = original;
    }
  });

  it('defaults to data/notes.db when DATABASE_PATH is unset', () => {
    delete process.env.DATABASE_PATH;

    expect(getDatabasePath()).toBe('data/notes.db');
  });

  it('uses DATABASE_PATH when provided', () => {
    process.env.DATABASE_PATH = 'tmp/custom.db';

    expect(getDatabasePath()).toBe('tmp/custom.db');
  });
});

describe('SERVICE_NAME', () => {
  it('is a non-empty string', () => {
    expect(SERVICE_NAME).toBe('team-notes-api');
  });
});

describe('getBodyLimit', () => {
  const original = process.env.BODY_LIMIT;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.BODY_LIMIT;
    } else {
      process.env.BODY_LIMIT = original;
    }
  });

  it('defaults to 100kb when BODY_LIMIT is unset', () => {
    delete process.env.BODY_LIMIT;

    expect(getBodyLimit()).toBe('100kb');
  });

  it.each(['100kb', '1mb', '512', '2.5mb'])('accepts %s', (value) => {
    process.env.BODY_LIMIT = value;

    expect(getBodyLimit()).toBe(value);
  });

  it('rejects a malformed size', () => {
    process.env.BODY_LIMIT = 'lots';

    expect(() => getBodyLimit()).toThrow(/Invalid BODY_LIMIT/);
  });
});
