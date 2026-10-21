import request from 'supertest';
import type { TestApp } from './create-test-app';

export async function createUser(ctx: TestApp, name: string): Promise<string> {
  const response = await request(ctx.app.getHttpServer())
    .post('/users')
    .send({ name })
    .expect(201);
  return response.body.id;
}

export async function createTeam(
  ctx: TestApp,
  userId: string,
  name: string,
): Promise<string> {
  const response = await request(ctx.app.getHttpServer())
    .post('/teams')
    .set('X-User-Id', userId)
    .send({ name })
    .expect(201);
  return response.body.id;
}

export async function addMember(
  ctx: TestApp,
  ownerId: string,
  teamId: string,
  userId: string,
): Promise<void> {
  await request(ctx.app.getHttpServer())
    .post(`/teams/${teamId}/members`)
    .set('X-User-Id', ownerId)
    .send({ userId })
    .expect(201);
}
