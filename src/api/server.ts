import express from 'express';
import cors from 'cors';
import { wppRouter } from './WppController';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/wpp', wppRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de QR Code iniciado: http://localhost:${PORT}`);
});
