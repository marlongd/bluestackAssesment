import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SqliteDatabase } from '../database/database';
import { DB } from '../database/database.module';
import type { User } from './user.entity';

interface UserRow {
  id: string;
  name: string;
  created_at: string;
}

function toUser(row: UserRow): User {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

@Injectable()
export class UsersRepository {
  constructor(@Inject(DB) private readonly db: SqliteDatabase) {}

  create(name: string): User {
    const user: User = {
      id: randomUUID(),
      name,
      createdAt: new Date().toISOString(),
    };

    this.db
      .prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)')
      .run(user.id, user.name, user.createdAt);

    return user;
  }

  findById(id: string): User | null {
    const row = this.db
      .prepare('SELECT id, name, created_at FROM users WHERE id = ?')
      .get(id) as UserRow | undefined;

    return row ? toUser(row) : null;
  }
}
