"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultarDadosColaboradorUseCase = void 0;
class ConsultarDadosColaboradorUseCase {
    constructor(repo) {
        this.repo = repo;
    }
    execute(cpf, opcao) {
        return __awaiter(this, void 0, void 0, function* () {
            const colaborador = yield this.repo.buscarPorCpf(cpf);
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
        });
    }
}
exports.ConsultarDadosColaboradorUseCase = ConsultarDadosColaboradorUseCase;
