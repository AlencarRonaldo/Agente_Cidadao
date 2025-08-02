/**
 * Quick script to create an admin user for testing
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('🔐 Creating admin user for testing...');
    
    const email = 'admin@teste.com';
    const senha = 'Admin123!';
    const nome = 'Admin Teste';
    const role = 'ADMIN';
    
    // Hash password
    const hashedPassword = await bcrypt.hash(senha, 10);
    
    // Create or update user
    const user = await prisma.adminUser.upsert({
      where: { email },
      update: {
        senha: hashedPassword,
        ativo: true
      },
      create: {
        nome,
        email,
        senha: hashedPassword,
        role,
        ativo: true
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true
      }
    });
    
    console.log('✅ Admin user created/updated:', user);
    console.log('📧 Email:', email);
    console.log('🔑 Password:', senha);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();