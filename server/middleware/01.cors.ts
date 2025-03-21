export default defineEventHandler((event) => {
  // cors to accept requests from any origin
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  });
  
  // reponse to preflight requests
  if (event.method === 'OPTIONS') {
    event.res.statusCode = 204;
    event.res.end();
    return;
  }
});