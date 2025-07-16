import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { google, Auth } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = path.resolve('tokens/token.json');
const CREDENTIALS_PATH = path.resolve('google-credentials-drive.json');

export async function authorizeOAuth(): Promise<Auth.OAuth2Client> {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(`Arquivo de credenciais não encontrado: ${CREDENTIALS_PATH}`);
  }

  const file = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
  const json = JSON.parse(file);
  const credentials = json.installed;

  if (!credentials) {
    throw new Error('Campo "installed" não encontrado no JSON de credenciais.');
  }

  const { client_secret, client_id, redirect_uris } = credentials;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = fs.readFileSync(TOKEN_PATH, 'utf8');
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  }

  const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  console.log('🔗 Autorize este app acessando:\n' + authUrl);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise<string>(resolve => rl.question('🔐 Cole o código aqui: ', code => {
    rl.close();
    resolve(code);
  }));

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

  console.log('✅ Token salvo com sucesso em:', TOKEN_PATH);
  return oAuth2Client;
}
