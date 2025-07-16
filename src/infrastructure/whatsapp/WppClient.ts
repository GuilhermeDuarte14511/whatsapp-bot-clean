import { create, Whatsapp, Message } from '@wppconnect-team/wppconnect';

export async function iniciarWpp(
  onMessage: (msg: Message, from: string, client: Whatsapp) => void
) {
  const client = await create({
    session: 'bot-holerite',
    catchQR: (base64Qrimg, asciiQR) => {
      console.log('🟡 Escaneie o QR Code abaixo para conectar ao WhatsApp:\n');
      console.log(asciiQR);
    },
    statusFind: (statusSession, session) => {
      console.log(`🔵 Status da sessão '${session}': ${statusSession}`);
    },
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
