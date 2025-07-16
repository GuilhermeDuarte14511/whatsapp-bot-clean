import dotenv from 'dotenv';
import { iniciarWpp } from '../../src/infrastructure/whatsapp/WppClient';
import { Whatsapp, Message } from '@wppconnect-team/wppconnect';
import { GoogleSheetsColaboradorRepository } from '../../src/infrastructure/sheets/GoogleSheetsColaboradorRepository';
import { ConsultarDadosColaboradorUseCase } from '../../src/application/usecases/ConsultarDadosColaboradorUseCase';
import { GoogleDriveService } from '../../src/infrastructure/drive/GoogleDriveService';

dotenv.config();

type Etapa = 'aguardandoCpf' | 'menu' | 'submenuHolerite' | 'submenuAtestado' | 'submenuRecibo' | 'aguardandoUpload';
type TipoUpload = 'holerites' | 'atestados' | 'recibos';

interface Conversa {
  etapa: Etapa;
  cpf?: string;
  tipoUpload?: TipoUpload;
}

const conversas = new Map<string, Conversa>();
const sheetsRepo = new GoogleSheetsColaboradorRepository();
const usecase = new ConsultarDadosColaboradorUseCase(sheetsRepo);

export async function iniciarBot(): Promise<void> {
  const driveRepo = await GoogleDriveService.build();

  const onMessage = async (msg: Message, from: string, client: Whatsapp): Promise<void> => {
    const texto = msg.body?.trim() ?? '';
    const conversa = conversas.get(from) ?? { etapa: 'aguardandoCpf' };

    if (conversa.etapa === 'aguardandoCpf') {
      // Remove sufixo "@c.us" e loga o telefone
      const telefone = from.replace(/@c\.us$/, '');
      console.log('📞 Tentando buscar telefone:', telefone);

      const auto = await sheetsRepo.buscarPorTelefone(telefone);
      console.log('🔍 Resultado da busca na planilha:', auto);

      if (auto) {
        console.log(`✅ Telefone reconhecido: ${telefone} → CPF ${auto.cpf}`);
        return await processarColaborador(auto.cpf, from, client, auto.nome);
      }

      // Solicita CPF se não for detectado automaticamente
      if (!/^\d{11}$/.test(texto)) {
        await client.sendText(from, '👋 Olá! Envie seu *CPF (somente números)* para continuar.');
        conversas.set(from, { etapa: 'aguardandoCpf' });
        return;
      }

      const colaborador = await sheetsRepo.buscarPorCpf(texto);
      if (!colaborador) {
        await client.sendText(from, '❌ CPF não encontrado. Verifique e tente novamente.');
        return;
      }

      await processarColaborador(texto, from, client, colaborador.nome);
      return;
    }

    if (conversa.etapa === 'aguardandoUpload') {
      const isValido =
        msg.isMedia ||
        ['image', 'application'].some(t => msg.mimetype?.startsWith(t)) ||
        ['document', 'image', 'video', 'audio'].includes(msg.type ?? '');

      if (!isValido) {
        await client.sendText(from, '❌ Envie um *arquivo válido* (PDF, imagem, doc, etc).');
        return;
      }

      let base64: string | null = null;
      try {
        base64 = await client.downloadMedia(msg);
      } catch (e) {
        console.error('Erro download:', e);
        await client.sendText(from, '❌ Erro ao baixar o arquivo.');
        return;
      }

      const buffer = Buffer.from(base64?.split(',').pop() ?? '', 'base64');
      const nomeArquivo = `arquivo_${Date.now()}`;
      const link = await driveRepo.uploadArquivoParaSubpasta(conversa.cpf!, conversa.tipoUpload!, nomeArquivo, buffer);

      if (link) {
        await client.sendText(from, `✅ Arquivo salvo!\n🔗 ${link}`);
      } else {
        await client.sendText(from, '❌ Erro ao salvar o arquivo no Drive.');
      }

      conversas.set(from, { etapa: 'menu', cpf: conversa.cpf });
      return;
    }

    const handleSubmenu = async (tipo: TipoUpload) => {
      const cpf = conversa.cpf!;
      if (texto === '1') {
        const arquivos = await driveRepo.listarArquivosEmSubpasta(cpf, tipo);
        const label = tipo.charAt(0).toUpperCase() + tipo.slice(1);
        await client.sendText(from, arquivos.length ? `📂 ${label}:\n${arquivos.join('\n')}` : `📂 Nenhum ${label} encontrado.`);
      } else if (texto === '2') {
        conversas.set(from, { etapa: 'aguardandoUpload', cpf, tipoUpload: tipo });
        await client.sendText(from, `📎 Envie agora o *${tipo.slice(0, -1)}* para upload.`);
      } else if (texto.toLowerCase() === 'voltar') {
        conversas.set(from, { etapa: 'menu', cpf });
      } else {
        await client.sendText(from, '❌ Opção inválida. Use 1, 2 ou "voltar".');
      }
    };

    if (conversa.etapa === 'submenuHolerite') return handleSubmenu('holerites');
    if (conversa.etapa === 'submenuAtestado') return handleSubmenu('atestados');
    if (conversa.etapa === 'submenuRecibo') return handleSubmenu('recibos');

    if (conversa.etapa === 'menu') {
      const cpf = conversa.cpf!;
      switch (texto) {
        case '1':
        case '2':
        case '3':
          await client.sendText(from, await usecase.execute(cpf, texto));
          break;
        case '4':
          conversas.set(from, { etapa: 'submenuHolerite', cpf });
          await client.sendText(from, '📄 *Holerite*\n1️⃣ Ver\n2️⃣ Enviar\nDigite *voltar* para retornar.');
          return;
        case '5':
          conversas.set(from, { etapa: 'submenuAtestado', cpf });
          await client.sendText(from, '📎 *Atestado*\n1️⃣ Ver\n2️⃣ Enviar\nDigite *voltar* para retornar.');
          return;
        case '6':
          conversas.set(from, { etapa: 'submenuRecibo', cpf });
          await client.sendText(from, '📥 *Recibo*\n1️⃣ Ver\n2️⃣ Enviar\nDigite *voltar* para retornar.');
          return;
        case 'sair':
          conversas.delete(from);
          await client.sendText(from, '✅ Atendimento encerrado. Até a próxima!');
          return;
        default:
          await client.sendText(from, '❓ Opção inválida. Escolha uma das opções do menu.');
      }

      await client.sendText(from,
        `🔁 O que mais deseja?\n1️⃣ Salário\n2️⃣ VR\n3️⃣ VT\n4️⃣ Holerite\n5️⃣ Atestados\n6️⃣ Recibos\n\nDigite *sair* para encerrar.`);
    }
  };

  async function processarColaborador(cpf: string, from: string, client: Whatsapp, nome: string) {
    console.log(`🚀 Iniciando fluxo do colaborador ${nome} (CPF: ${cpf})`);

    const rootId = process.env.DRIVE_SHARED_FOLDER_ID!;
    const pastaId = await driveRepo.getOrCreateFolder(cpf, rootId);
    console.log(`📁 Pasta do colaborador criada/localizada: ${pastaId}`);

    const holeritesId = await driveRepo.getOrCreateFolder('holerites', pastaId);
    const atestadosId = await driveRepo.getOrCreateFolder('atestados', pastaId);
    const recibosId = await driveRepo.getOrCreateFolder('recibos', pastaId);

    console.log('📂 Subpastas criadas/localizadas:');
    console.log(` - Holerites: ${holeritesId}`);
    console.log(` - Atestados: ${atestadosId}`);
    console.log(` - Recibos: ${recibosId}`);

    const links = {
      holerites: await driveRepo.getPublicLink(holeritesId),
      atestados: await driveRepo.getPublicLink(atestadosId),
      recibos: await driveRepo.getPublicLink(recibosId),
    };

    console.log('🔗 Links públicos gerados:', links);

    await sheetsRepo.atualizarLinksDrive(cpf, links);
    console.log(`📝 Planilha atualizada com os links do Drive para o CPF ${cpf}`);

    conversas.set(from, { etapa: 'menu', cpf });

    await client.sendText(from,
      `✅ CPF reconhecido!\n\nOlá, *${nome}*! O que deseja consultar?\n\n` +
      `1️⃣ Salário\n2️⃣ VR\n3️⃣ VT\n4️⃣ Holerite\n5️⃣ Atestados\n6️⃣ Recibos\n\nDigite *sair* para encerrar.`);
  }

  await iniciarWpp(onMessage);
}
