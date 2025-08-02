const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy para todas as rotas da API
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3355',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.log('Proxy Error:', err);
        res.status(500).send('Proxy Error');
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying ${req.method} ${req.url} to ${proxyReq.path}`);
      }
    })
  );
};