/**
 * Teste do Instagram API Manager com Mock Mode
 */

require('dotenv').config();
const InstagramApiService = require('./src/services/instagram-api-service');

async function testMockMode() {
    console.log('🧪 Testando Instagram API Manager - Mock Mode\n');
    
    // Testar Graph API Service em modo mock
    const graphApi = new InstagramApiService();
    
    console.log('📋 Configuração:');
    console.log(`- Mock Mode: ${process.env.INSTAGRAM_GRAPH_MOCK_MODE}`);
    console.log(`- Access Token: ${process.env.INSTAGRAM_ACCESS_TOKEN ? 'Configurado' : 'Não configurado'}`);
    console.log();
    
    try {
        // Teste 1: Connection Test
        console.log('1️⃣ Testando conexão...');
        const connectionTest = await graphApi.testConnection();
        console.log(`✅ Resultado: ${connectionTest.success ? 'Sucesso' : 'Falha'}`);
        console.log(`📝 Mensagem: ${connectionTest.message}`);
        
        if (connectionTest.accountInfo) {
            console.log('👤 Dados da conta (mock):');
            console.log(`   - ID: ${connectionTest.accountInfo.id}`);
            console.log(`   - Username: @${connectionTest.accountInfo.username}`);
            console.log(`   - Nome: ${connectionTest.accountInfo.name}`);
            console.log(`   - Seguidores: ${connectionTest.accountInfo.followers_count}`);
        }
        console.log();
        
        // Teste 2: Post to Instagram
        console.log('2️⃣ Testando publicação...');
        const postResult = await graphApi.postToInstagram(
            'https://via.placeholder.com/400x400.jpg?text=Teste+Mock',
            '🧪 Post de teste - Modo Mock\n\n#TesteMock #BotDenuncia'
        );
        
        console.log(`📱 Publicação: ${postResult.success ? 'Sucesso' : 'Falha'}`);
        if (postResult.success) {
            console.log(`   - Media ID: ${postResult.mediaId}`);
            console.log(`   - Link: ${postResult.permalink}`);
        } else {
            console.log(`   - Erro: ${postResult.error}`);
        }
        console.log();
        
        // Teste 3: Health Status
        console.log('3️⃣ Testando status de saúde...');
        const healthStatus = await graphApi.getHealthStatus();
        console.log(`🔍 Status: ${healthStatus.status}`);
        console.log(`⚙️  Configurado: ${healthStatus.configured ? 'Sim' : 'Não'}`);
        console.log(`🧪 Mock Mode: ${healthStatus.mockMode ? 'Ativo' : 'Inativo'}`);
        console.log();
        
        // Teste 4: Recent Posts
        console.log('4️⃣ Testando listagem de posts...');
        const recentPosts = await graphApi.getRecentPosts(3);
        console.log(`📋 Posts encontrados: ${recentPosts.length}`);
        
        recentPosts.forEach((post, index) => {
            console.log(`   ${index + 1}. ${post.caption || 'Sem caption'}`);
            console.log(`      Data: ${new Date(post.timestamp).toLocaleDateString('pt-BR')}`);
        });
        
        console.log('\n✅ Todos os testes em modo mock passaram!');
        console.log('\n📌 Para usar a API real:');
        console.log('   1. Obtenha um token válido do Instagram Graph API');
        console.log('   2. Atualize INSTAGRAM_ACCESS_TOKEN no .env');
        console.log('   3. Defina INSTAGRAM_GRAPH_MOCK_MODE=false');
        
    } catch (error) {
        console.error('\n❌ Erro durante os testes:', error.message);
        console.error(error.stack);
    }
}

testMockMode();