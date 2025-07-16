import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import path from 'path';
import { IDriveService } from '../../domain/services/IGoogleDriveService';
import { authorizeOAuth } from './auth/GoogleDriveAuth';

export class GoogleDriveService implements IDriveService {
  private drive: drive_v3.Drive;
  private sharedFolderId: string;

  constructor(drive: drive_v3.Drive) {
    const id = process.env.DRIVE_SHARED_FOLDER_ID;
    if (!id) throw new Error('DRIVE_SHARED_FOLDER_ID não definido.');
    this.sharedFolderId = id;
    this.drive = drive;
  }

  static async build(): Promise<GoogleDriveService> {
    const auth = await authorizeOAuth();
    const drive = google.drive({ version: 'v3', auth });
    return new GoogleDriveService(drive);
  }

  private bufferToStream(buffer: Buffer): Readable {
    return Readable.from(buffer);
  }

  private detectMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  async getOrCreateFolder(name: string, parentId: string): Promise<string> {
    const query = `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const res = await this.drive.files.list({ q: query, fields: 'files(id)' });

    if (res.data.files?.length) return res.data.files[0].id!;

    const folder = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
    });

    return folder.data.id!;
  }

  async uploadArquivoParaSubpasta(cpf: string, subpasta: string, nome: string, buffer: Buffer): Promise<string | null> {
    try {
      const pastaCpf = await this.getOrCreateFolder(cpf, this.sharedFolderId);
      const pastaSub = await this.getOrCreateFolder(subpasta, pastaCpf);

      const file = await this.drive.files.create({
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

      if (!file.data.id) return null;

      await this.drive.permissions.create({
        fileId: file.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
      });

      const fileInfo = await this.drive.files.get({
        fileId: file.data.id,
        fields: 'webViewLink',
      });

      return fileInfo.data.webViewLink ?? null;
    } catch (err) {
      console.error('❌ Erro ao fazer upload para subpasta:', err);
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

      return res.data.files?.map(f => `${f.name} - ${f.webViewLink}`) ?? [];
    } catch (err) {
      console.error('❌ Erro ao listar arquivos:', err);
      return [];
    }
  }

  async getPublicLink(fileId: string): Promise<string> {
    try {
      await this.drive.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' },
      });

      const file = await this.drive.files.get({
        fileId,
        fields: 'webViewLink',
      });

      return file.data.webViewLink ?? '';
    } catch (err) {
      console.error('❌ Erro ao obter link público:', err);
      return '';
    }
  }
}
