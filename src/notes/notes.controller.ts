import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { DemoIdentityGuard } from '../auth/demo-identity.guard';
import type { Paginated } from '../common/paginated';
import type { User } from '../users/user.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { ListNotesQueryDto } from './dto/list-notes-query.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import type { Note } from './note.entity';
import { NotesService } from './notes.service';

/**
 * Parses the `If-Match` header into an integer version. The header carries the
 * version the client last read; missing or malformed values are a 400.
 */
function parseIfMatch(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') {
    throw new BadRequestException(
      'Missing If-Match header carrying the version being edited',
    );
  }

  const version = Number(raw.trim());
  if (!Number.isInteger(version) || version < 1) {
    throw new BadRequestException(`Invalid If-Match version: "${raw}"`);
  }

  return version;
}

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

  @Get(':noteId')
  get(
    @CurrentUser() user: User,
    @Param('teamId') teamId: string,
    @Param('noteId') noteId: string,
  ): Note {
    return this.notes.get(teamId, user, noteId);
  }

  @Put(':noteId')
  update(
    @CurrentUser() user: User,
    @Param('teamId') teamId: string,
    @Param('noteId') noteId: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() dto: UpdateNoteDto,
  ): Note {
    return this.notes.update(
      teamId,
      user,
      noteId,
      parseIfMatch(ifMatch),
      dto.title,
      dto.body,
    );
  }
}
