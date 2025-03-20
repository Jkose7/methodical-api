// server/routes/api/health.get.ts
import { defineEventHandler } from 'h3';

export default defineEventHandler(() => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString()
  };
});