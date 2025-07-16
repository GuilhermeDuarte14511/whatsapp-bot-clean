import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { google, Auth } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = path.resolve('tokens/token.json');

export async function authorizeOAuth(): Promise<Auth.OAuth2Client> {
  const credentialsEnv = process.env.GOOGLE_INSTALLED_JSON;

  if (!credentialsEnv) {
    throw new Error('❌ Variável de ambiente GOOGLE_INSTALLED_JSON não definida.');
  }

  let credentials;
  try {
    const parsed = JSON.parse(credentialsEnv);
    credentials = parsed.installed;
  } catch (err) {
    throw new Error('❌ Erro ao fazer parse do GOOGLE_INSTALLED_JSON: ' + err);
  }

  if (!credentials) {
    throw new Error('❌ Campo "installed" não encontrado no JSON da variável GOOGLE_INSTALLED_JSON.');
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
