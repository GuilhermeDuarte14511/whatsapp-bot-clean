export interface IDriveService {
  listarArquivosEmSubpasta(cpf: string, subpasta: string): Promise<string[]>;
  uploadArquivoParaSubpasta(cpf: string, subpasta: string, nomeArquivo: string, buffer: Buffer): Promise<string | null>;
  getPublicLink(fileId: string): Promise<string>;
}
