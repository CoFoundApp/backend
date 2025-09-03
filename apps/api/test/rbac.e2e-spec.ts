import './setup-env';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

function uniqueEmail(prefix: string) {
  return `${prefix}+${Date.now()}_${Math.random().toString(36).slice(2)}@test.local`;
}

async function signupOrLogin(app: INestApplication, email: string, password: string) {
  const qSignup = `mutation($email:String!,$password:String!){
    signup(input:{email:$email,password:$password}){ accessToken refreshToken }
  }`;
  let res = await request(app.getHttpServer())
    .post('/graphql').send({ query: qSignup, variables: { email, password } });
  let tokens = res.body?.data?.signup;

  if (!tokens) {
    const qLogin = `mutation($email:String!,$password:String!){
      login(input:{email:$email,password:$password}){ accessToken refreshToken }
    }`;
    res = await request(app.getHttpServer())
      .post('/graphql').send({ query: qLogin, variables: { email, password } });
    tokens = res.body?.data?.login;
  }
  if (!tokens) throw new Error('signup/login failed: ' + JSON.stringify(res.body));
  return tokens;
}

async function whoami(app: INestApplication, accessToken: string) {
  const q = `{ whoami }`;
  const res = await request(app.getHttpServer())
    .post('/graphql')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ query: q });
  return res;
}

describe('RBAC (GraphQL)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('user can signup + whoami works', async () => {
    const email = uniqueEmail('rbac_user');
    const { accessToken } = await signupOrLogin(app, email, 'Password123!');
    const res = await whoami(app, accessToken);
    expect(res.status).toBe(200);
    expect(res.body.data.whoami).toContain(':'); // "<userId>:<role>"
    expect(res.body.errors).toBeUndefined();
  });
});
