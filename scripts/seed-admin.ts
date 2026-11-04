import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Admin User...');

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('secure-password-123', 10);

    // Upsert the admin user
    const admin = await prisma.user.upsert({
      where: { email: 'admin@stulink.com' },
      update: {
        // If user exists, update password
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
      create: {
        email: 'admin@stulink.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'SUPER_ADMIN',
        isActive: true,
        emailVerified: new Date(), // Mark as verified
      },
    });

    console.log('✅ Admin user created/updated successfully!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password: secure-password-123');
    console.log('👤 Role:', admin.role);
    console.log('🆔 User ID:', admin.id);
    console.log('\n🚀 You can now log in with these credentials!');
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
