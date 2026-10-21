export type TeamRole = 'owner' | 'member';

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface TeamMembership {
  teamId: string;
  userId: string;
  role: TeamRole;
  createdAt: string;
}
