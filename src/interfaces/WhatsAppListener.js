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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.iniciarBot = iniciarBot;
const dotenv_1 = __importDefault(require("dotenv"));
const WppClient_1 = require("../../src/infrastructure/whatsapp/WppClient");
const GoogleSheetsColaboradorRepository_1 = require("../../src/infrastructure/sheets/GoogleSheetsColaboradorRepository");
const ConsultarDadosColaboradorUseCase_1 = require("../../src/application/usecases/ConsultarDadosColaboradorUseCase");
const GoogleDriveService_1 = require("../../src/infrastructure/drive/GoogleDriveService");
dotenv_1.default.config();
const conversas = new Map();
const sheetsRepo = new GoogleSheetsColaboradorRepository_1.GoogleSheetsColaboradorRepository();
const usecase = new ConsultarDadosColaboradorUseCase_1.ConsultarDadosColaboradorUseCase(sheetsRepo);
function iniciarBot() {
    return __awaiter(this, void 0, void 0, function* () {
        const driveRepo = yield GoogleDriveService_1.GoogleDriveService.build();
        const onMessage = (msg, from, client) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const texto = (_b = (_a = msg.body) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : '';
            const conversa = (_c = conversas.get(from)) !== null && _c !== void 0 ? _c : { etapa: 'aguardandoCpf' };
            if (conversa.etapa === 'aguardandoCpf') {
                // Remove sufixo "@c.us" e loga o telefone
                const telefone = from.replace(/@c\.us$/, '');
                console.log('📞 Tentando buscar telefone:', telefone);
                const auto = yield sheetsRepo.buscarPorTelefone(telefone);
                console.log('🔍 Resultado da busca na planilha:', auto);
                if (auto) {
                    console.log(`✅ Telefone reconhecido: ${telefone} → CPF ${auto.cpf}`);
                    return yield processarColaborador(auto.cpf, from, client, auto.nome);
                }
                // Solicita CPF se não for detectado automaticamente
                if (!/^\d{11}$/.test(texto)) {
                    yield client.sendText(from, '👋 Olá! Envie seu *CPF (somente números)* para continuar.');
                    conversas.set(from, { etapa: 'aguardandoCpf' });
                    return;
                }
                const colaborador = yield sheetsRepo.buscarPorCpf(texto);
                if (!colaborador) {
                    yield client.sendText(from, '❌ CPF não encontrado. Verifique e tente novamente.');
                    return;
                }
                yield processarColaborador(texto, from, client, colaborador.nome);
                return;
            }
            if (conversa.etapa === 'aguardandoUpload') {
                const isValido = msg.isMedia ||
                    ['image', 'application'].some(t => { var _a; return (_a = msg.mimetype) === null || _a === void 0 ? void 0 : _a.startsWith(t); }) ||
                    ['document', 'image', 'video', 'audio'].includes((_d = msg.type) !== null && _d !== void 0 ? _d : '');
                if (!isValido) {
                    yield client.sendText(from, '❌ Envie um *arquivo válido* (PDF, imagem, doc, etc).');
                    return;
                }
                let base64 = null;
                try {
                    base64 = yield client.downloadMedia(msg);
                }
                catch (e) {
                    console.error('Erro download:', e);
                    yield client.sendText(from, '❌ Erro ao baixar o arquivo.');
                    return;
                }
                const buffer = Buffer.from((_e = base64 === null || base64 === void 0 ? void 0 : base64.split(',').pop()) !== null && _e !== void 0 ? _e : '', 'base64');
                const nomeArquivo = `arquivo_${Date.now()}`;
                const link = yield driveRepo.uploadArquivoParaSubpasta(conversa.cpf, conversa.tipoUpload, nomeArquivo, buffer);
                if (link) {
                    yield client.sendText(from, `✅ Arquivo salvo!\n🔗 ${link}`);
                }
                else {
                    yield client.sendText(from, '❌ Erro ao salvar o arquivo no Drive.');
                }
                conversas.set(from, { etapa: 'menu', cpf: conversa.cpf });
                return;
            }
            const handleSubmenu = (tipo) => __awaiter(this, void 0, void 0, function* () {
                const cpf = conversa.cpf;
                if (texto === '1') {
                    const arquivos = yield driveRepo.listarArquivosEmSubpasta(cpf, tipo);
                    const label = tipo.charAt(0).toUpperCase() + tipo.slice(1);
                    yield client.sendText(from, arquivos.length ? `📂 ${label}:\n${arquivos.join('\n')}` : `📂 Nenhum ${label} encontrado.`);
                }
                else if (texto === '2') {
                    conversas.set(from, { etapa: 'aguardandoUpload', cpf, tipoUpload: tipo });
                    yield client.sendText(from, `📎 Envie agora o *${tipo.slice(0, -1)}* para upload.`);
                }
                else if (texto.toLowerCase() === 'voltar') {
                    conversas.set(from, { etapa: 'menu', cpf });
                }
                else {
                    yield client.sendText(from, '❌ Opção inválida. Use 1, 2 ou "voltar".');
                }
            });
            if (conversa.etapa === 'submenuHolerite')
                return handleSubmenu('holerites');
            if (conversa.etapa === 'submenuAtestado')
                return handleSubmenu('atestados');
            if (conversa.etapa === 'submenuRecibo')
                return handleSubmenu('recibos');
            if (conversa.etapa === 'menu') {
                const cpf = conversa.cpf;
                switch (texto) {
                    case '1':
                    case '2':
                    case '3':
                        yield client.sendText(from, yield usecase.execute(cpf, texto));
                        break;
                    case '4':
                        conversas.set(from, { etapa: 'submenuHolerite', cpf });
                        yield client.sendText(from, '📄 *Holerite*\n1️⃣ Ver\n2️⃣ Enviar\nDigite *voltar* para retornar.');
                        return;
                    case '5':
                        conversas.set(from, { etapa: 'submenuAtestado', cpf });
                        yield client.sendText(from, '📎 *Atestado*\n1️⃣ Ver\n2️⃣ Enviar\nDigite *voltar* para retornar.');
                        return;
                    case '6':
                        conversas.set(from, { etapa: 'submenuRecibo', cpf });
                        yield client.sendText(from, '📥 *Recibo*\n1️⃣ Ver\n2️⃣ Enviar\nDigite *voltar* para retornar.');
                        return;
                    case 'sair':
                        conversas.delete(from);
                        yield client.sendText(from, '✅ Atendimento encerrado. Até a próxima!');
                        return;
                    default:
                        yield client.sendText(from, '❓ Opção inválida. Escolha uma das opções do menu.');
                }
                yield client.sendText(from, `🔁 O que mais deseja?\n1️⃣ Salário\n2️⃣ VR\n3️⃣ VT\n4️⃣ Holerite\n5️⃣ Atestados\n6️⃣ Recibos\n\nDigite *sair* para encerrar.`);
            }
        });
        function processarColaborador(cpf, from, client, nome) {
            return __awaiter(this, void 0, void 0, function* () {
                console.log(`🚀 Iniciando fluxo do colaborador ${nome} (CPF: ${cpf})`);
                const rootId = process.env.DRIVE_SHARED_FOLDER_ID;
                const pastaId = yield driveRepo.getOrCreateFolder(cpf, rootId);
                console.log(`📁 Pasta do colaborador criada/localizada: ${pastaId}`);
                const holeritesId = yield driveRepo.getOrCreateFolder('holerites', pastaId);
                const atestadosId = yield driveRepo.getOrCreateFolder('atestados', pastaId);
                const recibosId = yield driveRepo.getOrCreateFolder('recibos', pastaId);
                console.log('📂 Subpastas criadas/localizadas:');
                console.log(` - Holerites: ${holeritesId}`);
                console.log(` - Atestados: ${atestadosId}`);
                console.log(` - Recibos: ${recibosId}`);
                const links = {
                    holerites: yield driveRepo.getPublicLink(holeritesId),
                    atestados: yield driveRepo.getPublicLink(atestadosId),
                    recibos: yield driveRepo.getPublicLink(recibosId),
                };
                console.log('🔗 Links públicos gerados:', links);
                yield sheetsRepo.atualizarLinksDrive(cpf, links);
                console.log(`📝 Planilha atualizada com os links do Drive para o CPF ${cpf}`);
                conversas.set(from, { etapa: 'menu', cpf });
                yield client.sendText(from, `✅ CPF reconhecido!\n\nOlá, *${nome}*! O que deseja consultar?\n\n` +
                    `1️⃣ Salário\n2️⃣ VR\n3️⃣ VT\n4️⃣ Holerite\n5️⃣ Atestados\n6️⃣ Recibos\n\nDigite *sair* para encerrar.`);
            });
        }
        yield (0, WppClient_1.iniciarWpp)(onMessage);
    });
}
