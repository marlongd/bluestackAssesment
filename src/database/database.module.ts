import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { getDatabasePath } from '../config';
import { openDatabase, type SqliteDatabase } from './database';
import { runMigrations } from './migrate';

export const DB = Symbol('DB');

@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: (): SqliteDatabase => {
        const db = openDatabase(getDatabasePath());
        runMigrations(db);
        return db;
      },
    },
  ],
  exports: [DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DB) private readonly db: SqliteDatabase) {}

  onApplicationShutdown(): void {
    this.db.close();
  }
}
