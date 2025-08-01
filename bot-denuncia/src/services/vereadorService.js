const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class VereadorService {
  constructor() {}

  async buscarPorBairro(bairroNome) {
    // Primeiro tentar busca exata
    let vereadores = await prisma.vereador.findMany({
      where: {
        bairros: {
          has: bairroNome
        },
        ativo: true
      }
    });
    
    // Se não encontrou, tentar busca case-insensitive
    if (vereadores.length === 0) {
      const todosVereadores = await prisma.vereador.findMany({
        where: { ativo: true }
      });
      
      // Normalizar texto para comparação
      const bairroNormalizado = this.normalizarTexto(bairroNome);
      
      vereadores = todosVereadores.filter(vereador => {
        return vereador.bairros.some(bairro => {
          const bairroDbNormalizado = this.normalizarTexto(bairro);
          return bairroDbNormalizado === bairroNormalizado;
        });
      });
    }
    
    return vereadores;
  }
  
  normalizarTexto(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ç/g, 'c')
      .trim();
  }

  async selecionarParaDenuncia(bairroNome, especialidade = null) {
    let vereadoresDisponiveis = await this.buscarPorBairro(bairroNome);

    if (especialidade) {
      vereadoresDisponiveis = vereadoresDisponiveis.filter(v => v.especialidades.includes(especialidade));
    }

    // Algoritmo de seleção com rotatividade (simplificado por enquanto)
    // Para bairros especiais (Vila São Pedro, Vila Esperança, etc.), incluir todos os vereadores
    const bairrosEspeciais = [
      'Vila São Pedro', 'Vila Sao Pedro',
      'Vila Esperança', 'Vila Esperanca', 
      'Jardim dos Químicos', 'Jardim dos Quimicos',
      'Industrial', 'Boa Vista'
    ];
    
    const bairroNormalizado = this.normalizarTexto(bairroNome);
    const ehBairroEspecial = bairrosEspeciais.some(b => 
      this.normalizarTexto(b) === bairroNormalizado
    );
    
    // Se é bairro especial, incluir todos os vereadores (máximo 5)
    // Senão, manter limite de 3 vereadores
    const limite = ehBairroEspecial ? 5 : 3;
    const selecionados = vereadoresDisponiveis.slice(0, limite);

    // TODO: Implementar lógica de rotatividade e prioridade mais avançada

    return selecionados;
  }

  // Métodos CRUD (a serem implementados ou via Admin Panel)
  async criarVereador(data) {
    return prisma.vereador.create({ data });
  }

  async atualizarVereador(id, data) {
    return prisma.vereador.update({ where: { id }, data });
  }

  async deletarVereador(id) {
    return prisma.vereador.delete({ where: { id } });
  }

  async listarVereadores() {
    return prisma.vereador.findMany();
  }
}

module.exports = new VereadorService();
