const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDenuncias() {
  try {
    const count = await prisma.denuncia.count();
    console.log('Total denuncias in database:', count);
    
    if (count > 0) {
      const recent = await prisma.denuncia.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          protocolo: true,
          status: true,
          texto: true,
          bairro: true,
          createdAt: true
        }
      });
      
      console.log('\nRecent denuncias:');
      recent.forEach(d => {
        console.log(`- ID: ${d.id}, Protocolo: ${d.protocolo}, Status: ${d.status}, Bairro: ${d.bairro}`);
      });
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDenuncias();