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
exports.GoogleSheetsColaboradorRepository = void 0;
const googleapis_1 = require("googleapis");
class GoogleSheetsColaboradorRepository {
    constructor() {
        this.auth = new googleapis_1.google.auth.GoogleAuth({
            keyFile: 'google-credentials.json',
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive',
            ],
        });
    }
    getSheetsClient() {
        return __awaiter(this, void 0, void 0, function* () {
            return googleapis_1.google.sheets({ version: 'v4', auth: this.auth });
        });
    }
    getDriveClient() {
        return __awaiter(this, void 0, void 0, function* () {
            return googleapis_1.google.drive({ version: 'v3', auth: this.auth });
        });
    }
    buscarPorCpf(cpf) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const sheets = yield this.getSheetsClient();
            const res = yield sheets.spreadsheets.values.get({
                spreadsheetId: process.env.SHEET_ID,
                range: 'Colaboradores!A2:K',
            });
            const rows = res.data.values || [];
            for (const row of rows) {
                if (row[0] === cpf) {
                    return {
                        cpf: row[0],
                        nome: row[1],
                        salario: row[3],
                        beneficios: {
                            vr: { valor: row[4], previsao: row[5] },
                            vt: { valor: row[6], previsao: row[7] },
                        },
                        holeriteLink: row[8],
                        atestadosLinks: (_b = (_a = row[9]) === null || _a === void 0 ? void 0 : _a.split(',')) !== null && _b !== void 0 ? _b : [],
                        recibosLinks: (_d = (_c = row[10]) === null || _c === void 0 ? void 0 : _c.split(',')) !== null && _d !== void 0 ? _d : [],
                    };
                }
            }
            return null;
        });
    }
    buscarPorTelefone(telefone) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const sheets = yield this.getSheetsClient();
            const res = yield sheets.spreadsheets.values.get({
                spreadsheetId: process.env.SHEET_ID,
                range: 'Colaboradores!A2:K',
            });
            const rows = res.data.values || [];
            for (const row of rows) {
                const telefonePlanilha = ((_a = row[2]) !== null && _a !== void 0 ? _a : '').replace(/\D/g, '');
                const telefoneLimpo = telefone.replace(/\D/g, '');
                if (telefonePlanilha.endsWith(telefoneLimpo)) {
                    return {
                        cpf: row[0],
                        nome: row[1],
                        salario: row[3],
                        beneficios: {
                            vr: { valor: row[4], previsao: row[5] },
                            vt: { valor: row[6], previsao: row[7] },
                        },
                        holeriteLink: row[8],
                        atestadosLinks: (_c = (_b = row[9]) === null || _b === void 0 ? void 0 : _b.split(',')) !== null && _c !== void 0 ? _c : [],
                        recibosLinks: (_e = (_d = row[10]) === null || _d === void 0 ? void 0 : _d.split(',')) !== null && _e !== void 0 ? _e : [],
                    };
                }
            }
            return null;
        });
    }
    atualizarLinksDrive(cpf, links) {
        return __awaiter(this, void 0, void 0, function* () {
            const sheets = yield this.getSheetsClient();
            const res = yield sheets.spreadsheets.values.get({
                spreadsheetId: process.env.SHEET_ID,
                range: 'Colaboradores!A2:K',
            });
            const rows = res.data.values || [];
            const rowIndex = rows.findIndex((row) => row[0] === cpf);
            if (rowIndex === -1)
                return;
            const rowNumber = rowIndex + 2;
            yield sheets.spreadsheets.values.update({
                spreadsheetId: process.env.SHEET_ID,
                range: `Colaboradores!H${rowNumber}:J${rowNumber}`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [[links.holerites, links.atestados, links.recibos]],
                },
            });
        });
    }
    atualizarLinksEtelefone(cpf, telefone, links) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const sheets = yield this.getSheetsClient();
            const res = yield sheets.spreadsheets.values.get({
                spreadsheetId: process.env.SHEET_ID,
                range: 'Colaboradores!A2:K',
            });
            const rows = res.data.values || [];
            const rowIndex = rows.findIndex((row) => row[0] === cpf);
            if (rowIndex === -1) {
                console.warn(`⚠️ CPF ${cpf} não encontrado na planilha.`);
                return;
            }
            const updateRow = rowIndex + 2;
            const range = `Colaboradores!C${updateRow}:K${updateRow}`;
            const values = [
                telefone,
                '', '', '', '', '',
                (_a = links.holerites) !== null && _a !== void 0 ? _a : '',
                (_b = links.atestados) !== null && _b !== void 0 ? _b : '',
                (_c = links.recibos) !== null && _c !== void 0 ? _c : '',
            ];
            yield sheets.spreadsheets.values.update({
                spreadsheetId: process.env.SHEET_ID,
                range,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [values] },
            });
            console.log(`✅ Planilha atualizada para CPF ${cpf}`);
        });
    }
    criarPastasSeNecessario(cpf) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const drive = yield this.getDriveClient();
            const parentFolderId = process.env.DRIVE_PARENT_FOLDER_ID;
            const subpastas = ['holerites', 'atestados', 'recibos'];
            const links = {};
            const cpfFolderSearch = yield drive.files.list({
                q: `'${parentFolderId}' in parents and name = '${cpf}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                fields: 'files(id)',
            });
            let cpfFolderId = (_b = (_a = cpfFolderSearch.data.files) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.id;
            if (!cpfFolderId) {
                const res = yield drive.files.create({
                    requestBody: {
                        name: cpf,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [parentFolderId],
                    },
                    fields: 'id',
                });
                cpfFolderId = res.data.id;
            }
            for (const subpasta of subpastas) {
                const existing = yield drive.files.list({
                    q: `'${cpfFolderId}' in parents and name = '${subpasta}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                    fields: 'files(id)',
                });
                let folderId = (_d = (_c = existing.data.files) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.id;
                if (!folderId) {
                    const res = yield drive.files.create({
                        requestBody: {
                            name: subpasta,
                            mimeType: 'application/vnd.google-apps.folder',
                            parents: [cpfFolderId],
                        },
                        fields: 'id',
                    });
                    folderId = res.data.id;
                }
                yield drive.permissions.create({
                    fileId: folderId,
                    requestBody: { role: 'reader', type: 'anyone' },
                });
                links[subpasta] = `https://drive.google.com/drive/folders/${folderId}`;
            }
            return {
                holerites: links.holerites,
                atestados: links.atestados,
                recibos: links.recibos,
            };
        });
    }
}
exports.GoogleSheetsColaboradorRepository = GoogleSheetsColaboradorRepository;
