// Configurações de APIs externas (Google Maps, Instagram, etc.)
// As chaves de API devem ser carregadas de variáveis de ambiente.

const APIS = {
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    INSTAGRAM_USERNAME: process.env.INSTAGRAM_USERNAME,
    INSTAGRAM_PASSWORD: process.env.INSTAGRAM_PASSWORD,
};

module.exports = APIS;
