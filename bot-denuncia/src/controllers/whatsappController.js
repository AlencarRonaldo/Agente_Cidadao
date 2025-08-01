const express = require('express');
const router = express.Router();

// Rota de exemplo para webhook do WhatsApp (a ser implementada)
router.post('/webhook', (req, res) => {
    console.log('Webhook do WhatsApp recebido:', req.body);
    res.status(200).send('OK');
});

module.exports = router;
