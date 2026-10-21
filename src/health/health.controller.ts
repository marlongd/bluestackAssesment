import { Controller, Get, Inject } from '@nestjs/common';
import { DB } from '../database/database.module';
import type { SqliteDatabase } from '../database/database';

export interface HealthResponse {
  status: 'ok';
  uptime: number;
  db: 'ok' | 'error';
}

@Controller('health')
export class HealthController {
  constructor(@Inject(DB) private readonly db: SqliteDatabase) {}

  @Get()
  check(): HealthResponse {
    let dbStatus: HealthResponse['db'] = 'ok';
    try {
      this.db.prepare('SELECT 1').get();
    } catch {
      dbStatus = 'error';
    }

    return {
      status: 'ok',
      uptime: process.uptime(),
      db: dbStatus,
    };
  }
}
