// src/domain/repositories/IColaboradorRepository.ts
import { Colaborador } from '../entities/Colaborador';

export interface IColaboradorRepository {
  buscarPorCpf(cpf: string): Promise<Colaborador | null>;
  buscarPorTelefone(telefone: string): Promise<Colaborador | null>;
  atualizarLinksDrive(cpf: string, links: {
    holerites: string;
    atestados: string;
    recibos: string;
  }): Promise<void>;
  atualizarLinksEtelefone(
    cpf: string,
    telefone: string,
    links: { holerites?: string; atestados?: string; recibos?: string }
  ): Promise<void>;
  criarPastasSeNecessario(cpf: string): Promise<{ holerites: string; atestados: string; recibos: string }>;
}
