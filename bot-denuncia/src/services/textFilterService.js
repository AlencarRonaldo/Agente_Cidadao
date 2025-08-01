const { PALAVROES_CATEGORIAS, SUBSTITUICOES } = require('../config/constants');

class TextFilterService {
  constructor() {}

  analyze(text) {
    let score = 1.0; // Começa com score máximo (limpo)
    let filteredText = text;
    let rejected = false;
    let moderationDetails = [];

    const lowerCaseText = text.toLowerCase();

    // 1. Filtrar palavras extremas (descarte automático)
    for (const palavra of PALAVROES_CATEGORIAS.extremos) {
      if (lowerCaseText.includes(palavra)) {
        rejected = true;
        moderationDetails.push(`Conteúdo rejeitado: palavra extrema encontrada - '${palavra}'`);
        score = 0.0; // Score zero para descarte
        break; 
      }
    }

    if (rejected) {
      return { filteredText: "[CONTEÚDO REJEITADO]", score, rejected, moderationDetails };
    }

    // 2. Substituir palavras graves e leves
    for (const categoria in PALAVROES_CATEGORIAS) {
      if (categoria === 'extremos') continue; // Já tratado

      for (const palavra of PALAVROES_CATEGORIAS[categoria]) {
        if (lowerCaseText.includes(palavra)) {
          const substituicao = SUBSTITUICOES[palavra] || '[censurado]';
          // Substitui todas as ocorrências, case-insensitive
          filteredText = filteredText.replace(new RegExp(palavra, 'gi'), substituicao);
          moderationDetails.push(`Palavra '${palavra}' (${categoria}) substituída por '${substituicao}'`);
          
          // Ajusta o score com base na gravidade
          if (categoria === 'graves') {
            score = Math.min(score, 0.5); // Reduz score para revisão humana
          } else if (categoria === 'leves') {
            score = Math.min(score, 0.8); // Pequena redução, pode ser auto-aprovado
          }
        }
      }
    }

    // Preservação do contexto (lógica mais avançada seria aqui)
    // Por enquanto, a substituição já ajuda a preservar o contexto.

    // Regras de aprovação automática
    if (score >= 0.8) {
      moderationDetails.push("Aprovação automática: Score >= 0.8");
    } else if (score >= 0.5) {
      moderationDetails.push("Pendente para moderação humana: Score entre 0.5 e 0.7");
    } else {
      moderationDetails.push("Rejeição automática: Score < 0.5");
      rejected = true;
    }

    return { filteredText, score, rejected, moderationDetails };
  }
}

module.exports = new TextFilterService();
