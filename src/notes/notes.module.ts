import { Module } from '@nestjs/common';
import { TeamsModule } from '../teams/teams.module';
import { UsersModule } from '../users/users.module';
import { NotesController } from './notes.controller';
import { NotesRepository } from './notes.repository';
import { NotesService } from './notes.service';

@Module({
  imports: [TeamsModule, UsersModule],
  controllers: [NotesController],
  providers: [NotesRepository, NotesService],
  exports: [NotesRepository, NotesService],
})
export class NotesModule {}
