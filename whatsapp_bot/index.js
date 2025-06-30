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

    // Exemplo de como enviar a mensagem para o backend Flask
    if (msg.body) {
        try {
            const response = await axios.post(FLASK_BACKEND_URL, {
                usuario_whatsapp: msg.from,
                texto_original: msg.body,
                // Para imagens, você precisaria de uma lógica para baixar e enviar a URL
                imagem_url: null, // Placeholder
                endereco_denuncia: msg.body // Por enquanto, usando o corpo da mensagem como endereço
            });
            console.log('Resposta do backend Flask:', response.data);
            msg.reply('Sua denúncia foi recebida e está sendo processada!');
        } catch (error) {
            console.error('Erro ao enviar denúncia para o backend Flask:', error.message);
            msg.reply('Ocorreu um erro ao processar sua denúncia. Tente novamente mais tarde.');
        }
    }
});

client.initialize();