import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import os from 'os';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

// ✅ Corrigido: importação relativa correta
import { iniciarBot } from './interfaces/WhatsAppListener';
import { wppRouter } from './api/WppController';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

// CORS liberado (pode restringir por origem se quiser)
app.use(cors());

// Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsApp Bot API',
      version: '1.0.0',
      description: 'Documentação da API do backend do WhatsApp Bot',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`, // Você pode substituir por IP dinâmico se necessário
      },
    ],
  },
  apis: ['./src/api/*.ts'], // Esse caminho só é usado no build do Swagger, não precisa mudar
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rotas do bot
app.use('/api/wpp', wppRouter);

// Rota para descobrir IP local da API (útil para frontend local)
app.get('/api/url', (req, res) => {
  const interfaces = os.networkInterfaces();
  let localIP = 'localhost';

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
      }
    }
  }

  const url = `http://${localIP}:${PORT}`;
  res.json({ url });
});

// Mostrar rotas no terminal
function listarRotas() {
  if (!app._router) return;

  console.log('Rotas registradas no servidor:');
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
      console.log(`${methods} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler: any) => {
        const route = handler.route;
        if (route) {
          const methods = Object.keys(route.methods).join(', ').toUpperCase();
          const path = middleware.regexp.source
            .replace('^\\/', '/')
            .replace('\\/?(?=\\/|$)', '')
            .replace(/\\\//g, '/');
          console.log(`${methods} ${path}${route.path}`);
        }
      });
    }
  });
}

app.listen(PORT, () => {
  const interfaces = os.networkInterfaces();
  let localIP = 'localhost';

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
      }
    }
  }

  console.log(`🚀 Servidor rodando em: http://${localIP}:${PORT}`);
  listarRotas();

  iniciarBot(); // ✅ Inicia o bot ao subir servidor
});
