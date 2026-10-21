import { HealthController } from './health.controller';

describe('HealthController', () => {
  const controller = new HealthController();

  it('reports an ok status', () => {
    const result = controller.check();

    expect(result.status).toBe('ok');
  });

  it('reports a numeric uptime', () => {
    const result = controller.check();

    expect(typeof result.uptime).toBe('number');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });
});
