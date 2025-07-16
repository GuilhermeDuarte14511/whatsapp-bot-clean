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
exports.authorizeOAuth = authorizeOAuth;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const readline_1 = __importDefault(require("readline"));
const googleapis_1 = require("googleapis");
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = path_1.default.resolve('tokens/token.json');
const CREDENTIALS_PATH = path_1.default.resolve('google-credentials-drive.json');
function authorizeOAuth() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!fs_1.default.existsSync(CREDENTIALS_PATH)) {
            throw new Error(`Arquivo de credenciais não encontrado: ${CREDENTIALS_PATH}`);
        }
        const file = fs_1.default.readFileSync(CREDENTIALS_PATH, 'utf8');
        const json = JSON.parse(file);
        const credentials = json.installed;
        if (!credentials) {
            throw new Error('Campo "installed" não encontrado no JSON de credenciais.');
        }
        const { client_secret, client_id, redirect_uris } = credentials;
        const oAuth2Client = new googleapis_1.google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        if (fs_1.default.existsSync(TOKEN_PATH)) {
            const token = fs_1.default.readFileSync(TOKEN_PATH, 'utf8');
            oAuth2Client.setCredentials(JSON.parse(token));
            return oAuth2Client;
        }
        const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
        console.log('🔗 Autorize este app acessando:\n' + authUrl);
        const rl = readline_1.default.createInterface({ input: process.stdin, output: process.stdout });
        const code = yield new Promise(resolve => rl.question('🔐 Cole o código aqui: ', code => {
            rl.close();
            resolve(code);
        }));
        const { tokens } = yield oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        fs_1.default.mkdirSync(path_1.default.dirname(TOKEN_PATH), { recursive: true });
        fs_1.default.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log('✅ Token salvo com sucesso em:', TOKEN_PATH);
        return oAuth2Client;
    });
}
