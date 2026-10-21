import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { DemoIdentityGuard } from '../auth/demo-identity.guard';
import type { User } from '../users/user.entity';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import type { Team, TeamMembership } from './team.entity';
import { TeamsService } from './teams.service';

@Controller('teams')
@UseGuards(DemoIdentityGuard)
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  @HttpCode(201)
  create(@CurrentUser() user: User, @Body() dto: CreateTeamDto): Team {
    return this.teams.create(dto.name, user);
  }

  @Get()
  list(@CurrentUser() user: User): Team[] {
    return this.teams.listForUser(user);
  }

  @Post(':teamId/members')
  @HttpCode(201)
  addMember(
    @CurrentUser() user: User,
    @Param('teamId') teamId: string,
    @Body() dto: AddMemberDto,
  ): TeamMembership {
    return this.teams.addMember(teamId, user, dto.userId);
  }
}
