import { create, Whatsapp, Message } from '@wppconnect-team/wppconnect';
import { setQrCode, setStatusConectado } from '../../api/WppController';
import { getLocalApiUrl } from '../../utils/getApiUrl';

export async function iniciarWpp(
  onMessage: (msg: Message, from: string, client: Whatsapp) => void
): Promise<Whatsapp> {
  const client = await create({
    session: 'bot-holerite',
    catchQR: (base64Qrimg, asciiQR) => {
      // Armazena QR Code para API
      setQrCode(base64Qrimg);

      // Obtem a URL local da API para mostrar no console
      const apiUrl = getLocalApiUrl(); // por padrão porta 3001

      // Log completo no console
      console.log('\n🟡 Escaneie o QR Code abaixo para conectar ao WhatsApp:\n');
      console.log(asciiQR);
      console.log(`\n🌐 Acesse o QR Code graficamente no navegador:`);
      console.log(`${apiUrl}/api/wpp/qrcode\n`);
    },
    statusFind: (statusSession, session) => {
      const conectado = statusSession === 'inChat';
      setStatusConectado(conectado);

      const statusMsg = conectado
        ? '✅ Robô conectado ao WhatsApp!'
        : `🔵 Status da sessão '${session}': ${statusSession}`;
      console.log(statusMsg);
    },
    autoClose: 12000,
    headless: false,
    devtools: false,
    useChrome: true,
    browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  console.log('✅ Cliente WhatsApp iniciado com sucesso.');

  client.onMessage(async (message) => {
    if (message.from) {
      await onMessage(message, message.from, client);
    }
  });

  return client;
}
