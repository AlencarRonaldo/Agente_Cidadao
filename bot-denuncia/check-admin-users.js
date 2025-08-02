/**
 * Verificar e Criar Usuários Admin
 * Verifica se existem usuários admin no banco de dados
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = 'sua-chave-jwt-super-secreta-para-producao-trocar-123456789';

async function checkAndCreateAdmin() {
    console.log('🔍 VERIFICANDO USUÁRIOS ADMIN NO BANCO');
    console.log('=====================================\n');
    
    try {
        // 1. Verificar usuários existentes
        const existingUsers = await prisma.adminUser.findMany({
            select: {
                id: true,
                nome: true,
                email: true,
                role: true,
                ativo: true,
                createdAt: true
            }
        });
        
        console.log(`📊 Usuários encontrados: ${existingUsers.length}`);
        
        if (existingUsers.length > 0) {
            console.log('\n📋 USUÁRIOS EXISTENTES:');
            existingUsers.forEach((user, index) => {
                console.log(`${index + 1}. ID: ${user.id}`);
                console.log(`   Nome: ${user.nome}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Role: ${user.role}`);
                console.log(`   Ativo: ${user.ativo ? '✅' : '❌'}`);
                console.log(`   Criado: ${user.createdAt}`);
                console.log('');
            });
            
            // Criar token para o primeiro usuário ativo
            const activeUser = existingUsers.find(u => u.ativo);
            if (activeUser) {
                const tokenPayload = {
                    userId: activeUser.id,
                    email: activeUser.email,
                    role: activeUser.role,
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
                };
                
                const validToken = jwt.sign(tokenPayload, JWT_SECRET);
                
                console.log('🎯 TOKEN VÁLIDO PARA USUÁRIO EXISTENTE:');
                console.log('======================================');
                console.log(validToken);
                console.log('======================================\n');
                
                console.log('💡 COMO USAR NO NAVEGADOR:');
                console.log('1. DevTools (F12) > Application > Local Storage');
                console.log('2. Definir "adminToken" =', validToken);
                console.log('3. Definir "adminUser" =', JSON.stringify({
                    id: activeUser.id,
                    nome: activeUser.nome,
                    email: activeUser.email,
                    role: activeUser.role
                }));
                console.log('4. Recarregar página (F5)\n');
                
                console.log('🧪 TESTE CURL:');
                console.log(`curl -X POST "http://localhost:3355/api/admin/denuncias/cmdt4x12e00032w52lzl8jgtp/aprovar-e-postar" \\`);
                console.log(`  -H "Content-Type: application/json" \\`);
                console.log(`  -H "Authorization: Bearer ${validToken}" \\`);
                console.log(`  -d '{"acao":"aprovar_e_postar","confirmar_publicacao":"CONFIRMO_PUBLICACAO_IMEDIATA","usuario_confirmacao":"admin","motivo_urgencia":"teste de funcionalidade do sistema"}'`);
            }
        } else {
            console.log('\n❌ NENHUM USUÁRIO ADMIN ENCONTRADO');
            console.log('Criando usuário admin padrão...\n');
            
            // 2. Criar usuário admin padrão
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            const newUser = await prisma.adminUser.create({
                data: {
                    nome: 'Administrator',
                    email: 'admin@teste.com',
                    senha: hashedPassword,
                    role: 'ADMIN',
                    ativo: true
                }
            });
            
            console.log('✅ USUÁRIO ADMIN CRIADO:');
            console.log(`   ID: ${newUser.id}`);
            console.log(`   Nome: ${newUser.nome}`);
            console.log(`   Email: ${newUser.email}`);
            console.log(`   Senha: admin123`);
            console.log(`   Role: ${newUser.role}\n`);
            
            // 3. Criar token para o novo usuário
            const tokenPayload = {
                userId: newUser.id,
                email: newUser.email,
                role: newUser.role,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
            };
            
            const validToken = jwt.sign(tokenPayload, JWT_SECRET);
            
            console.log('🎯 TOKEN VÁLIDO PARA NOVO USUÁRIO:');
            console.log('==================================');
            console.log(validToken);
            console.log('==================================\n');
            
            console.log('💡 INSTRUÇÕES DE USO:');
            console.log('1. Use email: admin@teste.com');
            console.log('2. Use senha: admin123');
            console.log('3. Ou use o token diretamente no localStorage');
        }
        
    } catch (error) {
        console.error('❌ ERRO:', error.message);
        
        if (error.code === 'P1001') {
            console.log('\n💡 PROBLEMA: Não consegue conectar ao banco de dados');
            console.log('   Verifique se o PostgreSQL está rodando');
            console.log('   Verifique a string de conexão no .env');
        }
    } finally {
        await prisma.$disconnect();
    }
}

checkAndCreateAdmin();