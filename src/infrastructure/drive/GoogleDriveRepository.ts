import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { google, drive_v3, Auth } from 'googleapis';
import { Readable } from 'stream';
import { IDriveService } from '../../domain/services/IGoogleDriveService';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = path.resolve('tokens/token.json');

/**
 * Autoriza via OAuth com base na variável de ambiente GOOGLE_INSTALLED_JSON.
 */
async function authorizeOAuth(): Promise<Auth.OAuth2Client> {
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

  const { client_secret, client_id, redirect_uris } = credentials;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\n🔗 Autorize o app nesta URL:\n', authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code: string = await new Promise(resolve => {
    rl.question('\n🔐 Cole o código aqui: ', code => {
      rl.close();
      resolve(code);
    });
  });

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log('✅ Token salvo em:', TOKEN_PATH);
  return oAuth2Client;
}

/**
 * Implementação do serviço do Google Drive com OAuth2.
 */
export class GoogleDriveColaboradorRepository implements IDriveService {
  private drive: drive_v3.Drive;
  private sharedFolderId: string;

  constructor(drive: drive_v3.Drive) {
    const id = process.env.DRIVE_SHARED_FOLDER_ID;
    if (!id) throw new Error('❌ Variável de ambiente DRIVE_SHARED_FOLDER_ID não definida.');
    this.drive = drive;
    this.sharedFolderId = id;
  }

  private bufferToStream(buffer: Buffer): Readable {
    return Readable.from(buffer);
  }

  private detectMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const types: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return types[ext] || 'application/octet-stream';
  }

  async uploadArquivoParaSubpasta(
    cpf: string,
    subpasta: string,
    nomeArquivo: string,
    buffer: Buffer
  ): Promise<string | null> {
    try {
      const pastaCpf = await this.getOrCreateFolder(cpf, this.sharedFolderId);
      const pastaSub = await this.getOrCreateFolder(subpasta, pastaCpf);

      const res = await this.drive.files.create({
        requestBody: {
          name: nomeArquivo,
          parents: [pastaSub],
        },
        media: {
          mimeType: this.detectMimeType(nomeArquivo),
          body: this.bufferToStream(buffer),
        },
        fields: 'id, webViewLink',
      });

      return res.data.webViewLink ?? null;
    } catch (err) {
      console.error('❌ Erro ao fazer upload do arquivo:', err);
      return null;
    }
  }

  async listarArquivosEmSubpasta(cpf: string, subpasta: string): Promise<string[]> {
    try {
      const pastaCpf = await this.getOrCreateFolder(cpf, this.sharedFolderId);
      const pastaSub = await this.getOrCreateFolder(subpasta, pastaCpf);

      const res = await this.drive.files.list({
        q: `'${pastaSub}' in parents and trashed = false`,
        fields: 'files(name, webViewLink)',
      });

      return res.data.files?.map(file => `${file.name} - ${file.webViewLink}`) ?? [];
    } catch (err) {
      console.error('❌ Erro ao listar arquivos:', err);
      return [];
    }
  }

  async getOrCreateFolder(folderName: string, parentId: string): Promise<string> {
    const q = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;

    const existing = await this.drive.files.list({
      q,
      fields: 'files(id, name)',
    });

    if (existing.data.files?.length) {
      return existing.data.files[0].id!;
    }

    const folder = await this.drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
    });

    return folder.data.id!;
  }

  async getPublicLink(fileId: string): Promise<string> {
    try {
      await this.drive.permissions.create({
        fileId,
        requestBody: {
          type: 'anyone',
          role: 'reader',
        },
      });

      const result = await this.drive.files.get({
        fileId,
        fields: 'webViewLink',
      });

      return result.data.webViewLink ?? '';
    } catch (error) {
      console.error('❌ Erro ao gerar link público:', error);
      return '';
    }
  }

  static async build(): Promise<GoogleDriveColaboradorRepository> {
    const auth = await authorizeOAuth();
    const drive = google.drive({ version: 'v3', auth });
    return new GoogleDriveColaboradorRepository(drive);
  }
}
