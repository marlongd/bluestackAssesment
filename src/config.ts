export const SERVICE_NAME = 'team-notes-api';

export const DEFAULT_PORT = 3000;
export const DEFAULT_DATABASE_PATH = 'data/notes.db';
/** Maximum accepted request body size. An operational safeguard, not a note limit. */
export const DEFAULT_BODY_LIMIT = '100kb';

export function getPort(): number {
  const raw = process.env.PORT;
  if (raw === undefined || raw === '') {
    return DEFAULT_PORT;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(
      `Invalid PORT value: "${raw}". Expected an integer between 1 and 65535.`,
    );
  }

  return parsed;
}

export function getDatabasePath(): string {
  const raw = process.env.DATABASE_PATH;
  if (raw === undefined || raw === '') {
    return DEFAULT_DATABASE_PATH;
  }

  return raw;
}

const SIZE_PATTERN = /^\d+(\.\d+)?\s*(b|kb|mb)?$/i;

/**
 * Maximum accepted request body size, e.g. "100kb", "1mb", or a raw byte count.
 * This is an operational safeguard against oversized requests, distinct from
 * any per-field content limits.
 */
export function getBodyLimit(): string {
  const raw = process.env.BODY_LIMIT;
  if (raw === undefined || raw === '') {
    return DEFAULT_BODY_LIMIT;
  }

  if (!SIZE_PATTERN.test(raw.trim())) {
    throw new Error(
      `Invalid BODY_LIMIT value: "${raw}". Expected a size like "100kb", "1mb", or a byte count.`,
    );
  }

  return raw.trim();
}
