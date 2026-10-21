export const SERVICE_NAME = 'team-notes-api';

export const DEFAULT_PORT = 3000;
export const DEFAULT_DATABASE_PATH = 'data/notes.db';

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
