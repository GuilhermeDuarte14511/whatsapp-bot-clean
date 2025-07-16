"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wppRouter = void 0;
exports.setQrCode = setQrCode;
exports.setStatusConectado = setStatusConectado;
const express_1 = __importDefault(require("express"));
exports.wppRouter = express_1.default.Router();
// Armazenamento em memória para QR Code e status de conexão
let currentQrCodeBase64 = null;
let isConnected = false;
/**
 * @swagger
 * /api/wpp/qrcode:
 *   get:
 *     summary: Retorna o QR Code atual e o status de conexão do robô
 *     description: Se o robô estiver conectado, retorna apenas o status sem QR Code.
 *     responses:
 *       200:
 *         description: Objeto com status de conexão e QR Code em base64 (ou null)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected:
 *                   type: boolean
 *                   description: Status de conexão do robô
 *                   example: false
 *                 qrcode:
 *                   type: string
 *                   description: QR Code em base64, ou null se conectado
 *                   example: iVBORw0KGgoAAAANSUhEUgAA...
 */
exports.wppRouter.get('/qrcode', (req, res) => {
    return res.json({
        connected: isConnected,
        qrcode: isConnected ? null : currentQrCodeBase64,
    });
});
/**
 * @swagger
 * /api/wpp/status:
 *   get:
 *     summary: Retorna o status de conexão do robô
 *     responses:
 *       200:
 *         description: Objeto com status de conexão
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conectado:
 *                   type: boolean
 *                   description: true se o robô está conectado, false caso contrário
 *                   example: true
 */
exports.wppRouter.get('/status', (req, res) => {
    return res.json({ conectado: isConnected });
});
/**
 * Função para setar/atualizar o QR Code (chamada pelo seu bot)
 * @param qrBase64 - QR Code em base64
 */
function setQrCode(qrBase64) {
    currentQrCodeBase64 = qrBase64;
}
/**
 * Função para setar o status de conexão (chamada pelo seu bot)
 * @param conectado - true se conectado, false caso contrário
 */
function setStatusConectado(conectado) {
    isConnected = conectado;
    if (conectado) {
        currentQrCodeBase64 = null; // limpa QR quando conectar
    }
}
