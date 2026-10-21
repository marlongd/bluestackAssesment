import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { TeamsController } from './teams.controller';
import { TeamsRepository } from './teams.repository';
import { TeamsService } from './teams.service';

@Module({
  imports: [UsersModule],
  controllers: [TeamsController],
  providers: [TeamsRepository, TeamsService],
  exports: [TeamsRepository, TeamsService],
})
export class TeamsModule {}
