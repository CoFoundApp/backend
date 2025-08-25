import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

async function main() {
  const prisma = new PrismaClient();
  const email = process.env.ADMIN_EMAIL || 'admin@cofound.local';
  const pass = process.env.ADMIN_PASSWORD || 'ChangeMe!123';

  const existing = await prisma.users.findUnique({ where: { email } });
  if (existing) {
    console.log('admin exists:', existing.id);
    return;
  }
  const password_hash = await bcrypt.hash(pass, 12);
  const user = await prisma.users.create({
    data: { email, password_hash, role: 'admin' },
  });
  console.log('admin created:', user.id, email);
}

main().catch((e) => { console.error(e); process.exit(1); });
