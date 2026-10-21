import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { DemoIdentityGuard } from '../auth/demo-identity.guard';
import type { Paginated } from '../common/paginated';
import type { User } from '../users/user.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { ListNotesQueryDto } from './dto/list-notes-query.dto';
import type { Note } from './note.entity';
import { NotesService } from './notes.service';

@Controller('teams/:teamId/notes')
@UseGuards(DemoIdentityGuard)
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: User,
    @Param('teamId') teamId: string,
    @Body() dto: CreateNoteDto,
  ): Note {
    return this.notes.create(teamId, user, dto.title, dto.body);
  }

  @Get()
  list(
    @CurrentUser() user: User,
    @Param('teamId') teamId: string,
    @Query() query: ListNotesQueryDto,
  ): Paginated<Note> {
    return this.notes.list(teamId, user, query.limit, query.offset);
  }
}
