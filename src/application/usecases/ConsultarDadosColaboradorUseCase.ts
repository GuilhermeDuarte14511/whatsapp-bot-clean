import { IColaboradorRepository } from '../../domain/repositories/IColaboradorRepository';

export class ConsultarDadosColaboradorUseCase {
  constructor(
    private readonly repo: IColaboradorRepository
  ) {}

  async execute(cpf: string, opcao: string): Promise<string> {
    const colaborador = await this.repo.buscarPorCpf(cpf);
    if (!colaborador) {
      return '❌ Colaborador não encontrado. Verifique o CPF.';
    }

    switch (opcao) {
      case '1':
        return `💰 *Salário:* ${colaborador.salario}`;

      case '2':
        return `🍽️ *VR:* ${colaborador.beneficios.vr.valor} (Previsto: ${colaborador.beneficios.vr.previsao})`;

      case '3':
        return `🚌 *VT:* ${colaborador.beneficios.vt.valor} (Previsto: ${colaborador.beneficios.vt.previsao})`;

      default:
        return '❌ Opção inválida. Escolha entre 1️⃣, 2️⃣ ou 3️⃣.';
    }
  }
}
