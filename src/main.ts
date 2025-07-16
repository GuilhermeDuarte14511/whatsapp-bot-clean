import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import os from 'os';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import { iniciarBot } from '../src/interfaces/WhatsAppListener';
import { wppRouter } from './src/api/WppController';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

// Habilitar CORS para todas as origens (ajuste se quiser restringir)
app.use(cors());

// Configuração Swagger
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
        url: `http://localhost:${PORT}`, // Ou ajuste para IP da máquina
      },
    ],
  },
  apis: ['./src/api/*.ts'], // Ajuste o caminho para seus arquivos com comentários Swagger
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware para Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Registrar rotas do WhatsApp
app.use('/api/wpp', wppRouter);

// Endpoint para a URL da API (que retorna a URL dinâmica)
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

// Função para listar rotas com segurança
function listarRotas() {
  if (!app._router) {
    console.log('Nenhuma rota registrada (app._router é undefined).');
    return;
  }

  console.log('Rotas registradas no servidor:');
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      // rota direta
      const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
      console.log(`${methods} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      // router montado
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

  iniciarBot();
});
