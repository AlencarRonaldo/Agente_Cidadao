const prisma = require('./src/config/database');

async function createAdmin() {
  try {
    // Hash gerado com bcryptjs 
    const hashedPassword = '$2a$10$yGpz.2VylHVfijNc4adcJ.g6gcULkyashdY1zP1aRbGVdO1KITMla'; // 123456
    
    const admin = await prisma.adminUser.upsert({
      where: { email: 'admin@teste.com' },
      update: { senha: hashedPassword },
      create: {
        nome: 'Admin Teste',
        email: 'admin@teste.com',
        senha: hashedPassword,
        role: 'ADMIN',
        ativo: true
      }
    });
    
    console.log('✅ Admin criado/atualizado:', admin.email);
    console.log('📧 Email:', admin.email);
    console.log('🔑 Senha: 123456');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();