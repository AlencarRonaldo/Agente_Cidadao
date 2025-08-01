require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const instagramService = require('./src/services/instagramService');
const logger = require('./src/utils/logger');

async function testDirectPublish() {
  try {
    console.log('🔍 TESTE DIRETO: Publicando denúncia diretamente...\n');
    
    // Buscar primeira denúncia aprovada
    const denuncia = await prisma.denuncia.findFirst({
      where: {
        status: 'APROVADA_ADMIN',
        aprovadaAdmin: true,
        publishedAt: null
      }
    });
    
    if (!denuncia) {
      console.log('❌ Nenhuma denúncia aprovada encontrada');
      return;
    }
    
    console.log('1. Denúncia encontrada:');
    console.log(`   - ID: ${denuncia.id}`);
    console.log(`   - Protocolo: ${denuncia.protocolo}`);
    console.log(`   - Status: ${denuncia.status}`);
    console.log(`   - Bairro: ${denuncia.bairro}`);
    console.log(`   - Texto: ${denuncia.texto.substring(0, 100)}...`);
    console.log('');
    
    // Inicializar Instagram
    console.log('2. Inicializando Instagram...');
    await instagramService.initialize();
    console.log('   ✅ Instagram inicializado');
    console.log('');
    
    // Formatar post
    console.log('3. Formatando post...');
    const textoPost = `⚠️ DENÚNCIA CIDADÃ

${denuncia.textoFiltrado || denuncia.texto}

📍 Local: ${denuncia.bairro}
🏛️ Vereadores da região:
${denuncia.vereadores.join(' ')}

👥 MORADORES: Curtam e compartilhem para dar visibilidade!
🏛️ PODER PÚBLICO: Esperamos providências!
Porque aqui é CIDADE PRA FRENTE!

#DenunciaCidada #FiscalizaSBC #SaoBernardoDoCampo #${denuncia.bairro.replace(/\s+/g, '').toLowerCase()} #ProblemasUrbanos #CidadeMelhor
Protocolo: ${denuncia.protocolo}`;
    
    console.log('   📝 Texto formatado');
    console.log('');
    
    // Publicar no Instagram
    console.log('4. Publicando no Instagram...');
    const resultado = await instagramService.publicar({
      texto: textoPost,
      imagem: denuncia.imagemUrl,
      vereadores: denuncia.vereadores
    });
    
    if (resultado.success) {
      console.log('   ✅ Publicação bem-sucedida!');
      console.log(`   - Post ID: ${resultado.postId}`);
      console.log(`   - Post URL: ${resultado.postUrl}`);
      
      // Atualizar no banco
      console.log('');
      console.log('5. Atualizando banco de dados...');
      await prisma.denuncia.update({
        where: { id: denuncia.id },
        data: {
          status: 'PUBLICADA',
          publishedAt: new Date()
        }
      });
      console.log('   ✅ Status atualizado para PUBLICADA');
      
    } else {
      console.log('   ❌ Falha na publicação');
      console.log(`   - Erro: ${resultado.error}`);
    }
    
  } catch (error) {
    console.error('❌ Erro durante teste direto:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectPublish();