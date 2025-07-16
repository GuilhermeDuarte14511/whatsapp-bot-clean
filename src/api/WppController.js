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
// Armazenamento em memória
let currentQrCodeBase64 = null;
let isConnected = false;
/**
 * Retorna o QR Code atual e o status de conexão do robô.
 * Se estiver conectado, retorna apenas o status (sem QR).
 */
exports.wppRouter.get('/qrcode', (req, res) => {
    return res.json({
        connected: isConnected,
        qrcode: isConnected ? null : currentQrCodeBase64,
    });
});
// (Opcional) Endpoint isolado para verificar status do robô
exports.wppRouter.get('/status', (req, res) => {
    return res.json({ conectado: isConnected });
});
// Setter do QR Code (chamado pelo WppClient)
function setQrCode(qrBase64) {
    currentQrCodeBase64 = qrBase64;
}
// Setter do status (chamado pelo WppClient)
function setStatusConectado(conectado) {
    isConnected = conectado;
    if (conectado) {
        currentQrCodeBase64 = null; // limpa QR quando conectar
    }
}
