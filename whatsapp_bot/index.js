const { Client, LocalAuth } = require('whatsapp-web.js');
const axios = require('axios');
const qrcode = require('qrcode-terminal'); // Adicionado

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
    }
});

// URL do seu backend Flask
const FLASK_BACKEND_URL = 'http://localhost:5000/denuncia';

// Objeto para armazenar o estado da conversa de cada usuário
const userStates = {};

client.on('qr', (qr) => {
    // Gerar e exibir o QR code no console para autenticação
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, { small: true }); // Adicionado
});

client.on('ready', () => {
    console.log('Sessão autenticada com sucesso!');
});

client.on('message', async msg => {
    console.log('MESSAGE RECEIVED', msg.body);
    const chat = await msg.getChat();
    const userId = msg.from;

    // Inicializa o estado do usuário se não existir
    if (!userStates[userId]) {
        userStates[userId] = { stage: 'start', data: {} };
    }

    const currentState = userStates[userId];

    // Comando para iniciar ou cancelar a conversa
    if (msg.body === '1') {
        userStates[userId] = { stage: 'complaint', data: {} };
        msg.reply('Olá! Para iniciar sua reclamação, por favor, descreva o problema (ex: buraco na rua, lixo acumulado, etc.).');
        return;
    } else if (msg.body === '2') {
        userStates[userId] = { stage: 'start', data: {} };
        msg.reply('Reclamação cancelada. Digite 1 para iniciar uma nova reclamação.');
        return;
    }

    switch (currentState.stage) {
        case 'start':
            // Se o usuário apenas enviou uma mensagem sem iniciar, pede para iniciar
            msg.reply('Olá! Para iniciar uma reclamação, digite 1. Para cancelar, digite 2.');
            break;

        case 'complaint':
            currentState.data.texto_original = msg.body;
            currentState.stage = 'address';
            msg.reply('Certo. Agora, por favor, informe o endereço completo da reclamação (rua, número, bairro).');
            break;

        case 'address':
            currentState.data.endereco_denuncia = msg.body;
            currentState.stage = 'cep';
            msg.reply('Ok. Qual o CEP do local da reclamação? Se não souber, digite 1.');
            break;

        case 'cep':
            if (msg.body === '1') {
                currentState.data.cep = 'Não informado';
            } else {
                currentState.data.cep = msg.body;
            }
            currentState.stage = 'name';
            msg.reply('Entendido. Por favor, informe seu nome completo para registro.');
            break;

        case 'name':
            currentState.data.usuario_whatsapp = msg.body; // Usando o nome como identificador temporário
            currentState.stage = 'photo';
            msg.reply('Obrigado! Agora, se possível, envie uma foto que comprove a reclamação. Se não tiver, digite 1 para pular.');
            break;

        case 'photo':
            let imageUrl = null;
            if (msg.hasMedia) {
                const media = await msg.downloadMedia();
                // Em um cenário real, você faria upload desta mídia para um serviço de armazenamento
                // e obteria uma URL pública. Por simplicidade, vamos usar um placeholder.
                imageUrl = 'URL_DA_IMAGEM_AQUI'; // Placeholder
                msg.reply('Foto recebida! Processando reclamação...');
            } else if (msg.body === '1') {
                imageUrl = null; // Garante que a imagem seja nula
                msg.reply('Foto pulada. Processando reclamação...');
            } else {
                msg.reply('Por favor, envie uma foto ou digite 1 para pular.');
                return;
            }
            currentState.data.imagem_url = imageUrl;

            // Enviar todos os dados para o backend Flask
            try {
                const response = await axios.post(FLASK_BACKEND_URL, currentState.data);
                console.log('Resposta do backend Flask:', response.data);
                msg.reply('Sua reclamação foi recebida e está sendo processada! Ela será postada em breve em nossas redes sociais.');
            } catch (error) {
                console.error('Erro ao enviar denúncia para o backend Flask:', error.message);
                if (error.response) {
                    console.error('Detalhes do erro do backend:', error.response.data);
                }
                msg.reply('Ocorreu um erro ao processar sua denúncia. Tente novamente mais tarde.');
            }
            // Reseta o estado do usuário após a conclusão
            userStates[userId] = { stage: 'start', data: {} };
            break;

        default:
            msg.reply('Desculpe, não entendi. Digite 1 para iniciar uma nova denúncia.');
            userStates[userId] = { stage: 'start', data: {} };
            break;
    }
});

client.initialize();