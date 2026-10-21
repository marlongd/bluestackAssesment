export const SERVICE_NAME = 'team-notes-api';

export function getPort(): number {
  const raw = process.env.PORT;
  if (raw === undefined || raw === '') {
    return 3000;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(
      `Invalid PORT value: "${raw}". Expected an integer between 1 and 65535.`,
    );
  }

  return parsed;
}
