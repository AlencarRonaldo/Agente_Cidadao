/**
 * Script para limpar postagens agendadas fictícias
 * Remove agendamentos de teste e corrige status inconsistentes
 */

const { PrismaClient } = require('@prisma/client');

async function cleanScheduledPosts() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧹 Iniciando limpeza de agendamentos fictícios...');
    
    // 1. Verificar todas as postagens agendadas
    const scheduledPosts = await prisma.denuncia.findMany({
      where: {
        OR: [
          { status: 'AGENDADA' },
          { scheduledPublishAt: { not: null } }
        ]
      },
      select: {
        id: true,
        protocolo: true,
        status: true,
        scheduledPublishAt: true,
        createdAt: true,
        texto: true,
        endereco: true,
        phoneNumber: true
      },
      orderBy: {
        scheduledPublishAt: 'asc'
      }
    });
    
    console.log(`📊 Encontradas ${scheduledPosts.length} postagens agendadas`);
    
    // 2. Identificar agendamentos para as 19h
    const posts19h = scheduledPosts.filter(post => {
      if (!post.scheduledPublishAt) return false;
      const hour = new Date(post.scheduledPublishAt).getHours();
      return hour === 19;
    });
    
    console.log(`🕐 Postagens agendadas para 19h: ${posts19h.length}`);
    posts19h.forEach(post => {
      console.log(`   - ${post.protocolo}: ${post.scheduledPublishAt} - "${post.texto.substring(0, 50)}..."`);
    });
    
    // 3. Identificar possíveis postagens fictícias (critérios)
    const ficticiousPosts = scheduledPosts.filter(post => {
      // Critérios para identificar posts fictícios:
      // - Textos genéricos de teste
      // - Endereços obviamente falsos
      // - Números de telefone de teste
      const testTexts = [
        'teste', 'test', 'exemplo', 'sample', 'fake', 'ficticio', 'demo',
        'buraco na rua teste', 'problema teste', 'denuncia teste'
      ];
      
      const testAddresses = [
        'rua teste', 'endereco teste', 'test street', 'fake address',
        'rua das flores, 123', 'av teste'
      ];
      
      const testPhones = [
        '11999999999', '11111111111', '11000000000', '11123456789',
        '+5511999999999', '+5511111111111'
      ];
      
      const hasTestText = testTexts.some(test => 
        post.texto.toLowerCase().includes(test.toLowerCase())
      );
      
      const hasTestAddress = testAddresses.some(test => 
        post.endereco.toLowerCase().includes(test.toLowerCase())
      );
      
      const hasTestPhone = testPhones.includes(post.phoneNumber);
      
      return hasTestText || hasTestAddress || hasTestPhone;
    });
    
    console.log(`🎭 Postagens fictícias identificadas: ${ficticiousPosts.length}`);
    ficticiousPosts.forEach(post => {
      console.log(`   - ${post.protocolo}: "${post.texto.substring(0, 50)}..." - ${post.endereco}`);
    });
    
    // 4. Listar postagens que parecem reais para confirmação
    const realPosts = scheduledPosts.filter(post => !ficticiousPosts.includes(post));
    console.log(`✅ Postagens que parecem reais: ${realPosts.length}`);
    realPosts.forEach(post => {
      console.log(`   - ${post.protocolo}: ${post.scheduledPublishAt} - "${post.texto.substring(0, 50)}..."`);
    });
    
    // 5. Confirmar antes de deletar
    console.log('\n⚠️  ATENÇÃO: Este script irá:');
    console.log(`   - Remover ${ficticiousPosts.length} postagens fictícias`);
    console.log(`   - Manter ${realPosts.length} postagens reais`);
    console.log('\n Para executar a limpeza, adicione o parâmetro --execute');
    
    if (process.argv.includes('--execute')) {
      console.log('\n🗑️  Executando limpeza...');
      
      if (ficticiousPosts.length > 0) {
        const result = await prisma.denuncia.updateMany({
          where: {
            id: { in: ficticiousPosts.map(p => p.id) }
          },
          data: {
            status: 'REJEITADA_ADMIN',
            scheduledPublishAt: null,
            motivoRejeicaoAdmin: 'Postagem fictícia/teste removida automaticamente'
          }
        });
        
        console.log(`✅ ${result.count} postagens fictícias removidas do agendamento`);
      }
      
      // 6. Corrigir inconsistências de status
      const inconsistentPosts = await prisma.denuncia.updateMany({
        where: {
          AND: [
            { status: { not: 'AGENDADA' } },
            { scheduledPublishAt: { not: null } }
          ]
        },
        data: {
          scheduledPublishAt: null
        }
      });
      
      console.log(`🔧 ${inconsistentPosts.count} inconsistências de status corrigidas`);
      
    } else {
      console.log('\n💡 Execute novamente com --execute para confirmar a limpeza');
    }
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  cleanScheduledPosts();
}

module.exports = { cleanScheduledPosts };