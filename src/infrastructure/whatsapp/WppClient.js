"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.iniciarWpp = iniciarWpp;
const wppconnect_1 = require("@wppconnect-team/wppconnect");
const WppController_1 = require("../../api/WppController");
function iniciarWpp(onMessage) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield (0, wppconnect_1.create)({
            session: 'bot-holerite',
            catchQR: (base64Qrimg, asciiQR) => {
                // Armazena QR para API e exibe no terminal
                (0, WppController_1.setQrCode)(base64Qrimg);
                console.log('🟡 Escaneie o QR Code abaixo para conectar ao WhatsApp:\n');
                console.log(asciiQR);
            },
            statusFind: (statusSession, session) => {
                const conectado = statusSession === 'inChat';
                (0, WppController_1.setStatusConectado)(conectado);
                const statusMsg = conectado ? '✅ Robô conectado ao WhatsApp!' : `🔵 Status da sessão '${session}': ${statusSession}`;
                console.log(statusMsg);
            },
            headless: false,
            devtools: false,
            useChrome: true,
            browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        console.log('✅ Cliente WhatsApp iniciado com sucesso.');
        client.onMessage((message) => __awaiter(this, void 0, void 0, function* () {
            if (message.from) {
                yield onMessage(message, message.from, client);
            }
        }));
        return client;
    });
}
