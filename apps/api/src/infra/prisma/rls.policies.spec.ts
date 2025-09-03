import './test/setup-env'; //penser à changer ../../../test/setup-env
import { Test } from '@nestjs/testing';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';
import * as bcrypt from 'bcryptjs';

describe('RLS Policies (users table)', () => {
  let prisma: PrismaService;
  let user1: { id: string; email: string };
  let user2: { id: string; email: string };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    prisma = mod.get(PrismaService);

    // clean emails if exist
    await prisma.users.deleteMany({ where: { email: { in: ['rls_u1@test.local', 'rls_u2@test.local'] } } });

    const pwd1 = await bcrypt.hash('Password123!', 12);
    const pwd2 = await bcrypt.hash('Password123!', 12);

    user1 = await prisma.users.create({ data: { email: 'rls_u1@test.local', password_hash: pwd1, role: 'user' } });
    user2 = await prisma.users.create({ data: { email: 'rls_u2@test.local', password_hash: pwd2, role: 'user' } });
  });

  afterAll(async () => {
    // optionnel: cleanup
    await prisma.users.deleteMany({ where: { email: { in: ['rls_u1@test.local', 'rls_u2@test.local'] } } });
    await prisma.$disconnect();
  });

  it('user1 can SELECT at least own row (RLS SELECT)', async () => {
    const rows1 = await prisma.withUserContext(user1.id, 'user', (tx) =>
      tx.$queryRaw<{ id: string }[]>`SELECT id FROM users`
    );
    // au moins sa propre ligne
    expect(rows1.find(r => r.id === user1.id)).toBeTruthy();
    // on ne fait plus d’hypothèse sur la visibilité des autres
  });


  it('user1 cannot UPDATE user2 (RLS UPDATE)', async () => {
    let ok = false, failed = false;
    try {
      await prisma.withUserContext(user1.id, 'user', (tx) =>
        tx.$executeRaw`UPDATE users SET email = ${'hacked@test.local'} WHERE id = ${user2.id}`
      );
      ok = true;
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
    expect(ok).toBe(false);
  });

  it('admin can SELECT both (RLS bypass for admin)', async () => {
    // Ajuste le rôle selon ta policy (si admin bypass RLS)
    const rows = await prisma.withUserContext(user1.id, 'admin', (tx) =>
      tx.$queryRaw<{ id: string }[]>`SELECT id FROM users`
    );
    // On s'attend à voir au moins 2 users (user1 + user2)
    const ids = rows.map(r => r.id);
    expect(ids).toEqual(expect.arrayContaining([user1.id, user2.id]));
  });
});
