import { Beneficio } from './Beneficio.js';

export interface Colaborador {
  cpf: string;
  nome: string;
  salario: string;
  beneficios: {
    vr: Beneficio;
    vt: Beneficio;
  };
  holeriteLink: string;
  atestadosLinks?: string[];
  recibosLinks?: string[];
}