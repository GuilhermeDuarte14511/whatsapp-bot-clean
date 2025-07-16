export interface IDriveService {
  /**
   * Lista os arquivos existentes em uma subpasta dentro da pasta de um CPF.
   * @param cpf CPF do colaborador (pasta raiz).
   * @param subpasta Nome da subpasta (ex: 'holerites', 'atestados', etc).
   * @returns Lista de strings contendo o nome e o link dos arquivos.
   */
  listarArquivosEmSubpasta(cpf: string, subpasta: string): Promise<string[]>;

  /**
   * Realiza o upload de um arquivo para uma subpasta dentro da pasta do CPF.
   * @param cpf CPF do colaborador (pasta raiz).
   * @param subpasta Nome da subpasta (ex: 'holerites').
   * @param nomeArquivo Nome do arquivo (com extensão).
   * @param buffer Conteúdo do arquivo em buffer.
   * @returns Link público do arquivo enviado ou null em caso de erro.
   */
  uploadArquivoParaSubpasta(
    cpf: string,
    subpasta: string,
    nomeArquivo: string,
    buffer: Buffer
  ): Promise<string | null>;

  /**
   * Gera o link público de visualização para um arquivo ou pasta pelo ID.
   * @param fileId ID do arquivo ou pasta no Google Drive.
   * @returns Link público (webViewLink) ou string vazia em caso de erro.
   */
  getPublicLink(fileId: string): Promise<string>;
}
