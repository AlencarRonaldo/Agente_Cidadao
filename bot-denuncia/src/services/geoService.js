const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { GOOGLE_MAPS_API_KEY } = require('../config/apis');
const smartAnalysisService = require('./smartAnalysisService');

class GeoService {
  constructor() {}

  async parseAddress(address) {
    // Normalizar o endereço de entrada
    const addressNormalizado = this.normalizarTexto(address.trim());
    
    // Primeiro tentar usar o smartAnalysisService que tem os bairros mapeados
    const bairroEncontrado = this.buscarBairroNoSmartAnalysis(addressNormalizado);
    
    if (bairroEncontrado) {
      return { 
        bairro: bairroEncontrado, 
        encontrado: true, 
        sugestoes: [] 
      };
    }

    // Se não encontrou, tentar buscar no banco de dados
    try {
      const bairroDb = await prisma.bairro.findFirst({
        where: {
          OR: [
            { nome: { contains: addressNormalizado, mode: 'insensitive' } },
            { aliases: { has: addressNormalizado.toLowerCase() } }
          ]
        }
      });

      if (bairroDb) {
        return { bairro: bairroDb.nome, encontrado: true, sugestoes: [] };
      }
    } catch (error) {
      console.warn('Erro ao buscar no banco de dados:', error.message);
    }

    // Se não encontrou, gerar sugestões
    const sugestoes = this.gerarSugestoes(addressNormalizado);
    return { bairro: null, encontrado: false, sugestoes };
  }

  buscarBairroNoSmartAnalysis(addressNormalizado) {
    // Obter todos os bairros do smartAnalysisService
    const bairros = smartAnalysisService.listarBairros();
    
    // Tentar encontrar match exato primeiro
    for (const bairroInfo of bairros) {
      const bairroNormalizado = this.normalizarTexto(bairroInfo.bairro);
      
      // Match exato
      if (bairroNormalizado === addressNormalizado) {
        return bairroInfo.bairro;
      }
      
      // Match se o endereço contém o nome do bairro
      if (addressNormalizado.includes(bairroNormalizado)) {
        return bairroInfo.bairro;
      }
      
      // Match se o nome do bairro contém partes do endereço
      if (bairroNormalizado.includes(addressNormalizado)) {
        return bairroInfo.bairro;
      }
    }
    
    return null;
  }

  gerarSugestoes(addressNormalizado) {
    const bairros = smartAnalysisService.listarBairros();
    const sugestoes = [];
    
    for (const bairroInfo of bairros) {
      const bairroNormalizado = this.normalizarTexto(bairroInfo.bairro);
      
      // Calcular similaridade básica
      if (this.calcularSimilaridade(addressNormalizado, bairroNormalizado) > 0.3) {
        sugestoes.push(bairroInfo.bairro);
      }
    }
    
    return sugestoes.slice(0, 5);
  }

  normalizarTexto(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ç/g, 'c')
      .trim();
  }

  calcularSimilaridade(str1, str2) {
    const intersection = str1.split('').filter(char => str2.includes(char)).length;
    const union = str1.length + str2.length - intersection;
    return intersection / union;
  }
}

module.exports = new GeoService();
