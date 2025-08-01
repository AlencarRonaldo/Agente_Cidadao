const { Worker } = require('bullmq');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const textFilterService = require('../services/textFilterService');
const geoService = require('../services/geoService');
const vereadorService = require('../services/vereadorService');
const publishQueue = require('./publishQueue');

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
});

const processWorker = new Worker('processDenuncia', async (job) => {
  const { denunciaId, problema, endereco, imagem, vereadores } = job.data;
  console.log(`Processando denúncia ${denunciaId}...`);
  
  try {
    // 1. Filtragem de texto (re-executa para garantir, embora já feito no WhatsAppService)
    const { filteredText, score, rejected, moderationDetails } = textFilterService.analyze(problema);
    
    if (rejected) {
      await prisma.denuncia.update({
        where: { protocolo: denunciaId },
        data: {
          status: 'REJEITADA_BOT',
          motivoRejeicaoBot: moderationDetails.join('\n'),
          scoreBot: score,
        },
      });
      console.log(`Denúncia ${denunciaId} rejeitada pelo bot: ${moderationDetails.join(', ')}`);
      return;
    }

    // 2. Geolocalização (re-executa para garantir, embora já feito no WhatsAppService)
    const { bairro, encontrado, sugestoes } = await geoService.parseAddress(endereco);
    
    if (!encontrado) {
      await prisma.denuncia.update({
        where: { protocolo: denunciaId },
        data: {
          status: 'BAIRRO_INVALIDO',
          motivoRejeicaoBot: `Bairro não encontrado: ${endereco}. Sugestões: ${sugestoes.join(', ')}`,
        },
      });
      console.log(`Denúncia ${denunciaId} com bairro inválido.`);
      return;
    }

    // 3. Seleção de vereadores (re-executa para garantir, embora já feito no WhatsAppService)
    const vereadoresMencionados = await vereadorService.selecionarParaDenuncia(bairro);
    
    await prisma.denuncia.update({
      where: { protocolo: denunciaId },
      data: {
        textoFiltrado: filteredText,
        bairro: bairro,
        vereadores: vereadoresMencionados.map(v => v.instagram),
        status: 'PENDENTE_MODERACAO', // Aguardando aprovação do admin
        scoreBot: score,
      },
    });
    
    console.log(`Denúncia ${denunciaId} processada e aguardando moderação.`);
    
    // Adiciona à fila de publicação (após moderação manual, em um cenário real)
    // Por enquanto, vamos adicionar diretamente para simular o fluxo completo
    await publishQueue.add('publishInstagram', {
      denunciaId: denunciaId,
      texto: filteredText,
      imagem: imagem,
      vereadores: vereadoresMencionados.map(v => v.instagram),
      bairro: bairro,
    });
    
  } catch (error) {
    console.error(`Erro ao processar denúncia ${denunciaId}:`, error);
    await prisma.denuncia.update({
      where: { protocolo: denunciaId },
      data: {
        status: 'ERRO',
        motivoRejeicaoBot: `Erro interno: ${error.message}`,
      },
    });
  }
}, { connection });

console.log('Process Worker started.');
module.exports = processWorker;