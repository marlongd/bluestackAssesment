import type { SqliteDatabase } from '../database/database';
import { HealthController } from './health.controller';

function fakeDb(get: () => unknown): SqliteDatabase {
  return { prepare: () => ({ get }) } as unknown as SqliteDatabase;
}

describe('HealthController', () => {
  it('reports an ok status with a reachable database', () => {
    const controller = new HealthController(fakeDb(() => ({ '1': 1 })));

    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(result.db).toBe('ok');
    expect(typeof result.uptime).toBe('number');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });

  it('reports a database error when the probe throws', () => {
    const controller = new HealthController(
      fakeDb(() => {
        throw new Error('database is gone');
      }),
    );

    expect(controller.check().db).toBe('error');
  });
});
