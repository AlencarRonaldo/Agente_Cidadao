const textFilterService = require('../src/services/textFilterService');

describe('TextFilterService', () => {
  test('should filter mild profanity', () => {
    const result = textFilterService.analyze('Que merda de dia!');
    expect(result.filteredText).toBe('Que situação precária de dia!');
    expect(result.score).toBeLessThan(1.0);
    expect(result.rejected).toBe(false);
  });

  test('should reject extreme profanity', () => {
    const result = textFilterService.analyze('Você é um racista!');
    expect(result.filteredText).toBe('[CONTEÚDO REJEITADO]');
    expect(result.score).toBe(0.0);
    expect(result.rejected).toBe(true);
  });

  test('should return original text for clean input', () => {
    const result = textFilterService.analyze('Tudo ótimo por aqui.');
    expect(result.filteredText).toBe('Tudo ótimo por aqui.');
    expect(result.score).toBe(1.0);
    expect(result.rejected).toBe(false);
  });
});
