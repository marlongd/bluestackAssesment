export interface Note {
  id: string;
  teamId: string;
  title: string;
  body: string;
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
