//https://nitro.unjs.io/config
export default defineNitroConfig({
  srcDir: "server",
  compatibilityDate: '2025-03-19',
  runtimeConfig: {
    // Variables que estarán disponibles en el servidor
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    appUrl: process.env.APP_URL,
    // Valores por defecto para variables opcionales
    public: {
      // Variables que estarán disponibles en el cliente
    }
  },
  // Configuración de seguridad
  routeRules: {
    '/api/**': {
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': process.env.APP_URL,
        'Access-Control-Allow-Methods': 'GET, HEAD,POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    }
  },
});
