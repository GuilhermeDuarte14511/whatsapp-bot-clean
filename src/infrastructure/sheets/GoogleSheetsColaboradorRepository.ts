import { google, sheets_v4, drive_v3 } from 'googleapis';
import { Colaborador } from '../../domain/entities/Colaborador';
import { IColaboradorRepository } from '../../domain/repositories/IColaboradorRepository';

/**
 * Autenticação via chave de serviço fornecida pela variável de ambiente GOOGLE_SERVICE_ACCOUNT_JSON
 */
const getAuthClient = () => {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('❌ GOOGLE_SERVICE_ACCOUNT_JSON não definida.');

  const credentials = JSON.parse(raw);

  return new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
};

export class GoogleSheetsColaboradorRepository implements IColaboradorRepository {
  private auth = getAuthClient();

  private async getSheetsClient(): Promise<sheets_v4.Sheets> {
    return google.sheets({ version: 'v4', auth: this.auth });
  }

  private async getDriveClient(): Promise<drive_v3.Drive> {
    return google.drive({ version: 'v3', auth: this.auth });
  }

  async buscarPorCpf(cpf: string): Promise<Colaborador | null> {
    const sheets = await this.getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID!,
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
          atestadosLinks: row[9]?.split(',') ?? [],
          recibosLinks: row[10]?.split(',') ?? [],
        };
      }
    }

    return null;
  }

  async buscarPorTelefone(telefone: string): Promise<Colaborador | null> {
    const sheets = await this.getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID!,
      range: 'Colaboradores!A2:K',
    });

    const rows = res.data.values || [];

    for (const row of rows) {
      const telefonePlanilha = (row[2] ?? '').replace(/\D/g, '');
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
          atestadosLinks: row[9]?.split(',') ?? [],
          recibosLinks: row[10]?.split(',') ?? [],
        };
      }
    }

    return null;
  }

  async atualizarLinksDrive(cpf: string, links: {
    holerites: string;
    atestados: string;
    recibos: string;
  }): Promise<void> {
    const sheets = await this.getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID!,
      range: 'Colaboradores!A2:K',
    });

    const rows = res.data.values || [];
    const rowIndex = rows.findIndex((row) => row[0] === cpf);
    if (rowIndex === -1) return;

    const rowNumber = rowIndex + 2;

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID!,
      range: `Colaboradores!H${rowNumber}:J${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[links.holerites, links.atestados, links.recibos]],
      },
    });
  }

  async atualizarLinksEtelefone(
    cpf: string,
    telefone: string,
    links: { holerites?: string; atestados?: string; recibos?: string }
  ): Promise<void> {
    const sheets = await this.getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID!,
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
      links.holerites ?? '',
      links.atestados ?? '',
      links.recibos ?? '',
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID!,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    });

    console.log(`✅ Planilha atualizada para CPF ${cpf}`);
  }

  async criarPastasSeNecessario(cpf: string): Promise<{ holerites: string; atestados: string; recibos: string }> {
    const drive = await this.getDriveClient();
    const parentFolderId = process.env.DRIVE_PARENT_FOLDER_ID!;
    const subpastas = ['holerites', 'atestados', 'recibos'];
    const links: Record<string, string> = {};

    let cpfFolderId = (
      await drive.files.list({
        q: `'${parentFolderId}' in parents and name = '${cpf}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id)',
      })
    ).data.files?.[0]?.id;

    if (!cpfFolderId) {
      const res = await drive.files.create({
        requestBody: {
          name: cpf,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId],
        },
        fields: 'id',
      });
      cpfFolderId = res.data.id!;
    }

    for (const subpasta of subpastas) {
      let folderId = (
        await drive.files.list({
          q: `'${cpfFolderId}' in parents and name = '${subpasta}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          fields: 'files(id)',
        })
      ).data.files?.[0]?.id;

      if (!folderId) {
        const res = await drive.files.create({
          requestBody: {
            name: subpasta,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [cpfFolderId],
          },
          fields: 'id',
        });
        folderId = res.data.id!;
      }

      await drive.permissions.create({
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
  }
}
