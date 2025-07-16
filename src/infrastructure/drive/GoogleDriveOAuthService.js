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
exports.GoogleDriveColaboradorRepository = exports.GoogleDriveOAuthService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const readline_1 = __importDefault(require("readline"));
const googleapis_1 = require("googleapis");
const stream_1 = require("stream");
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = path_1.default.resolve('tokens/token.json');
const CREDENTIALS_PATH = path_1.default.resolve('client_secret_394353011841-85om534p3do7280ganbp6436noji0ghb.apps.googleusercontent.com.json');
function authorizeOAuth() {
    return __awaiter(this, void 0, void 0, function* () {
        const content = fs_1.default.readFileSync(CREDENTIALS_PATH, 'utf8');
        const credentials = JSON.parse(content).installed;
        const { client_secret, client_id, redirect_uris } = credentials;
        const oAuth2Client = new googleapis_1.google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        if (fs_1.default.existsSync(TOKEN_PATH)) {
            const token = JSON.parse(fs_1.default.readFileSync(TOKEN_PATH, 'utf8'));
            oAuth2Client.setCredentials(token);
            return oAuth2Client;
        }
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        console.log('\n🔗 Autorize o app nesta URL:\n', authUrl);
        const rl = readline_1.default.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        const code = yield new Promise(resolve => {
            rl.question('\n🔐 Cole o código aqui: ', code => {
                rl.close();
                resolve(code);
            });
        });
        const { tokens } = yield oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        fs_1.default.mkdirSync(path_1.default.dirname(TOKEN_PATH), { recursive: true });
        fs_1.default.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log('✅ Token salvo em:', TOKEN_PATH);
        return oAuth2Client;
    });
}
class GoogleDriveOAuthService {
    constructor(drive) {
        const sharedId = process.env.DRIVE_SHARED_FOLDER_ID;
        if (!sharedId) {
            throw new Error('❌ Variável de ambiente DRIVE_SHARED_FOLDER_ID não definida.');
        }
        this.drive = drive;
        this.sharedFolderId = sharedId;
    }
    bufferToStream(buffer) {
        return stream_1.Readable.from(buffer);
    }
    detectMimeType(fileName) {
        if (fileName.endsWith('.pdf'))
            return 'application/pdf';
        if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg'))
            return 'image/jpeg';
        if (fileName.endsWith('.png'))
            return 'image/png';
        if (fileName.endsWith('.docx'))
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        return 'application/octet-stream';
    }
    getOrCreateFolder(folderName, parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const q = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
            const existing = yield this.drive.files.list({
                q,
                fields: 'files(id, name)',
            });
            if (existing.data.files && existing.data.files.length > 0) {
                return existing.data.files[0].id;
            }
            const fileMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId],
            };
            const folder = yield this.drive.files.create({
                requestBody: fileMetadata,
                fields: 'id',
            });
            return folder.data.id;
        });
    }
    uploadArquivoParaSubpasta(cpf, subpasta, nomeArquivo, buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const pastaCpf = yield this.getOrCreateFolder(cpf, this.sharedFolderId);
                const pastaSub = yield this.getOrCreateFolder(subpasta, pastaCpf);
                const fileMetadata = {
                    name: nomeArquivo,
                    parents: [pastaSub],
                };
                const media = {
                    mimeType: this.detectMimeType(nomeArquivo),
                    body: this.bufferToStream(buffer),
                };
                const res = yield this.drive.files.create({
                    requestBody: fileMetadata,
                    media,
                    fields: 'id, webViewLink',
                });
                return (_a = res.data.webViewLink) !== null && _a !== void 0 ? _a : null;
            }
            catch (err) {
                console.error('❌ Erro ao fazer upload do arquivo:', err);
                return null;
            }
        });
    }
    getPublicLink(fileId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                yield this.drive.permissions.create({
                    fileId,
                    requestBody: {
                        type: 'anyone',
                        role: 'reader',
                    },
                });
                const result = yield this.drive.files.get({
                    fileId,
                    fields: 'webViewLink',
                });
                return (_a = result.data.webViewLink) !== null && _a !== void 0 ? _a : '';
            }
            catch (error) {
                console.error('❌ Erro ao gerar link público:', error);
                return '';
            }
        });
    }
    listarArquivosEmSubpasta(cpf, subpasta) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const pastaCpf = yield this.getOrCreateFolder(cpf, this.sharedFolderId);
                const pastaSub = yield this.getOrCreateFolder(subpasta, pastaCpf);
                const q = `'${pastaSub}' in parents and trashed = false`;
                const res = yield this.drive.files.list({
                    q,
                    fields: 'files(name, webViewLink)',
                });
                return (_b = (_a = res.data.files) === null || _a === void 0 ? void 0 : _a.map(file => `${file.name} - ${file.webViewLink}`)) !== null && _b !== void 0 ? _b : [];
            }
            catch (err) {
                console.error('❌ Erro ao listar arquivos:', err);
                return [];
            }
        });
    }
    static build() {
        return __awaiter(this, void 0, void 0, function* () {
            const auth = yield authorizeOAuth();
            const drive = googleapis_1.google.drive({ version: 'v3', auth });
            return new GoogleDriveOAuthService(drive);
        });
    }
}
exports.GoogleDriveOAuthService = GoogleDriveOAuthService;
exports.GoogleDriveColaboradorRepository = GoogleDriveOAuthService;
