import { Injectable, NotFoundException } from '@nestjs/common';
import type { User } from './user.entity';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  create(name: string): User {
    return this.users.create(name);
  }

  getById(id: string): User {
    const user = this.users.findById(id);
    if (!user) {
      throw new NotFoundException(`User "${id}" was not found`);
    }
    return user;
  }
}
