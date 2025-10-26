import './setup-env';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Projects GraphQL (e2e)', () => {
  let app: INestApplication;

  const uniqueEmail = (prefix: string) => `${prefix}+${Date.now()}_${Math.random().toString(36).slice(2)}@test.local`;

  const graphql = (query: string, variables?: Record<string, any>, token?: string) => {
    const req = request(app.getHttpServer()).post('/graphql');
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req.send({ query, variables });
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a project and lists it for the owner', async () => {
    const email = uniqueEmail('projects');
    const signupMutation = `mutation Signup($email:String!,$password:String!){
      signup(input:{email:$email,password:$password}){ accessToken }
    }`;

    const signupRes = await graphql(signupMutation, { email, password: 'Password123!' });
    expect(signupRes.body?.errors).toBeUndefined();
    const accessToken = signupRes.body?.data?.signup?.accessToken as string;
    expect(accessToken).toBeTruthy();

    const createMutation = `mutation Create($input:CreateProjectInput!){
      createProject(input:$input){ id title owner_id }
    }`;
    const createRes = await graphql(
      createMutation,
      { input: { title: 'Test Project' } },
      accessToken,
    );
    expect(createRes.body?.errors).toBeUndefined();
    const project = createRes.body?.data?.createProject;
    expect(project).toBeDefined();
    expect(project.title).toBe('Test Project');

    const listQuery = `query { listMyProjects { id title owner_id } }`;
    const listRes = await graphql(listQuery, undefined, accessToken);
    expect(listRes.body?.errors).toBeUndefined();
    const projects = listRes.body?.data?.listMyProjects;
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.find((p: any) => p.id === project.id)).toBeTruthy();
  });
});
