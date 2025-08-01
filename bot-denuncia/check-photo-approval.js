const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPhotoApproval() {
  try {
    console.log('=== VERIFICANDO SISTEMA DE APROVAÇÃO DE FOTOS ===');
    
    // Buscar denúncia específica
    const denuncia = await prisma.denuncia.findFirst({
      where: { protocolo: 'DEN-MDQQVIAF-AFP6D' },
      include: {
        photoPending: {
          orderBy: { uploadedAt: 'desc' }
        }
      }
    });
    
    if (!denuncia) {
      console.log('❌ Denúncia não encontrada');
      return;
    }
    
    console.log('✅ Denúncia encontrada:');
    console.log('  ID:', denuncia.id);
    console.log('  Protocolo:', denuncia.protocolo);
    console.log('  Status:', denuncia.status);
    console.log('  Foto aprovada pelo bot:', denuncia.aprovadaBot);
    console.log('  Foto aprovada pelo admin:', denuncia.aprovadaAdmin);
    console.log('  Schedulado para:', denuncia.scheduledPublishAt);
    console.log('  Imagem URL:', denuncia.imagemUrl);
    
    console.log('\n=== FOTOS PENDENTES ===');
    console.log('Total de fotos pendentes:', denuncia.photoPending.length);
    
    denuncia.photoPending.forEach((photo, i) => {
      console.log(`\n--- Foto ${i+1} ---`);
      console.log('  ID:', photo.id);
      console.log('  Status:', photo.status);
      console.log('  Arquivo:', photo.filename);
      console.log('  Upload em:', photo.uploadedAt);
      console.log('  Aprovado por:', photo.approvedBy);
      console.log('  Aprovado em:', photo.approvedAt);
      console.log('  Rejeitado por:', photo.rejectedBy);
      console.log('  Rejeitado em:', photo.rejectedAt);
      console.log('  Motivo rejeição:', photo.rejectionReason);
      console.log('  Instagram Post ID:', photo.instagramPostId);
      console.log('  Publicado em:', photo.publishedAt);
    });
    
    // Verificar se há problemas com aprovação
    console.log('\n=== ANÁLISE DE PROBLEMAS ===');
    
    if (denuncia.status === 'APROVADA_ADMIN' && !denuncia.scheduledPublishAt) {
      console.log('🔴 PROBLEMA: Denúncia aprovada pelo admin mas não agendada para publicação');
    }
    
    if (denuncia.photoPending.length === 0) {
      console.log('⚠️ AVISO: Nenhuma foto pendente encontrada no sistema');
    }
    
    const photosPendentes = denuncia.photoPending.filter(p => p.status === 'PENDING');
    if (photosPendentes.length > 0) {
      console.log(`⚠️ PROBLEMA: ${photosPendentes.length} fotos ainda pendentes de aprovação`);
    }
    
    const photosAprovadas = denuncia.photoPending.filter(p => p.status === 'APPROVED');
    if (photosAprovadas.length === 0) {
      console.log('🔴 PROBLEMA: Nenhuma foto aprovada no sistema');
    }
    
  } catch (error) {
    console.error('Erro ao verificar aprovação de fotos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPhotoApproval();