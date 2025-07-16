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
exports.GoogleDriveService = void 0;
const googleapis_1 = require("googleapis");
const stream_1 = require("stream");
const path_1 = __importDefault(require("path"));
const GoogleDriveAuth_1 = require("./auth/GoogleDriveAuth");
class GoogleDriveService {
    constructor(drive) {
        const id = process.env.DRIVE_SHARED_FOLDER_ID;
        if (!id)
            throw new Error('DRIVE_SHARED_FOLDER_ID não definido.');
        this.sharedFolderId = id;
        this.drive = drive;
    }
    static build() {
        return __awaiter(this, void 0, void 0, function* () {
            const auth = yield (0, GoogleDriveAuth_1.authorizeOAuth)();
            const drive = googleapis_1.google.drive({ version: 'v3', auth });
            return new GoogleDriveService(drive);
        });
    }
    bufferToStream(buffer) {
        return stream_1.Readable.from(buffer);
    }
    detectMimeType(fileName) {
        const ext = path_1.default.extname(fileName).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
    getOrCreateFolder(name, parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const query = `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
            const res = yield this.drive.files.list({ q: query, fields: 'files(id)' });
            if ((_a = res.data.files) === null || _a === void 0 ? void 0 : _a.length)
                return res.data.files[0].id;
            const folder = yield this.drive.files.create({
                requestBody: {
                    name,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parentId],
                },
                fields: 'id',
            });
            return folder.data.id;
        });
    }
    uploadArquivoParaSubpasta(cpf, subpasta, nome, buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const pastaCpf = yield this.getOrCreateFolder(cpf, this.sharedFolderId);
                const pastaSub = yield this.getOrCreateFolder(subpasta, pastaCpf);
                const file = yield this.drive.files.create({
                    requestBody: {
                        name: nome,
                        parents: [pastaSub],
                    },
                    media: {
                        mimeType: this.detectMimeType(nome),
                        body: this.bufferToStream(buffer),
                    },
                    fields: 'id',
                });
                if (!file.data.id)
                    return null;
                yield this.drive.permissions.create({
                    fileId: file.data.id,
                    requestBody: { role: 'reader', type: 'anyone' },
                });
                const fileInfo = yield this.drive.files.get({
                    fileId: file.data.id,
                    fields: 'webViewLink',
                });
                return (_a = fileInfo.data.webViewLink) !== null && _a !== void 0 ? _a : null;
            }
            catch (err) {
                console.error('❌ Erro ao fazer upload para subpasta:', err);
                return null;
            }
        });
    }
    listarArquivosEmSubpasta(cpf, subpasta) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const pastaCpf = yield this.getOrCreateFolder(cpf, this.sharedFolderId);
                const pastaSub = yield this.getOrCreateFolder(subpasta, pastaCpf);
                const res = yield this.drive.files.list({
                    q: `'${pastaSub}' in parents and trashed = false`,
                    fields: 'files(name, webViewLink)',
                });
                return (_b = (_a = res.data.files) === null || _a === void 0 ? void 0 : _a.map(f => `${f.name} - ${f.webViewLink}`)) !== null && _b !== void 0 ? _b : [];
            }
            catch (err) {
                console.error('❌ Erro ao listar arquivos:', err);
                return [];
            }
        });
    }
    getPublicLink(fileId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                yield this.drive.permissions.create({
                    fileId,
                    requestBody: { role: 'reader', type: 'anyone' },
                });
                const file = yield this.drive.files.get({
                    fileId,
                    fields: 'webViewLink',
                });
                return (_a = file.data.webViewLink) !== null && _a !== void 0 ? _a : '';
            }
            catch (err) {
                console.error('❌ Erro ao obter link público:', err);
                return '';
            }
        });
    }
}
exports.GoogleDriveService = GoogleDriveService;
