"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const os_1 = __importDefault(require("os"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const WhatsAppListener_1 = require("../src/interfaces/WhatsAppListener");
const WppController_1 = require("../../whatsapp-bot-clean/src/api/WppController"); // ajuste o caminho correto
const app = (0, express_1.default)();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
// Habilitar CORS para todas as origens (ajuste se quiser restringir)
app.use((0, cors_1.default)());
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
const swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
// Middleware para Swagger UI
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
// Registrar rotas do WhatsApp
app.use('/api/wpp', WppController_1.wppRouter);
// Endpoint para a URL da API (que retorna a URL dinâmica)
app.get('/api/url', (req, res) => {
    var _a;
    const interfaces = os_1.default.networkInterfaces();
    let localIP = 'localhost';
    for (const name of Object.keys(interfaces)) {
        for (const iface of (_a = interfaces[name]) !== null && _a !== void 0 ? _a : []) {
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
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            // rota direta
            const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
            console.log(`${methods} ${middleware.route.path}`);
        }
        else if (middleware.name === 'router') {
            // router montado
            middleware.handle.stack.forEach((handler) => {
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
    var _a;
    const interfaces = os_1.default.networkInterfaces();
    let localIP = 'localhost';
    for (const name of Object.keys(interfaces)) {
        for (const iface of (_a = interfaces[name]) !== null && _a !== void 0 ? _a : []) {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIP = iface.address;
            }
        }
    }
    console.log(`🚀 Servidor rodando em: http://${localIP}:${PORT}`);
    listarRotas();
    (0, WhatsAppListener_1.iniciarBot)();
});
