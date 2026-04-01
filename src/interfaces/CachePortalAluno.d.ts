import type { Timestamp } from "firebase/firestore";
import type {
    ChamadaChacheLicao,
    DetalhesAlunoCacheLicao,
} from "./CacheLicaoInterface";

interface ConquistaInterface {
    icon: string;
    titulo: string;
    descricao: string;
    raridade: "comum" | "rara" | "epica" | "lendaria" | "unica";
    tipo: "manual" | "automatica";
    detalhes: {
        [licaoId: string]: {
            trimestre: string;
            licaoNome: string;
            licaoId: string;
            classeId: string;
            classeNome: string;
            data: number;
        };
    };
    multiplicador: number;
}

interface HistoricoPortalInterface {
    classeId: string;
    classeNome: string;
    licaoId: string;
    data_inicio: number;
    data_fim: number;
    ano: number;
    titulo: string;
}

interface CachePortalAlunoInterface {
    alunoId: string;
    igrejaId: string;
    ministerioId: string;
    nome: string;
    data_nascimento: Timestamp;
    ultimaLicaoId?: string;

    conquistas: { [conquistaId: string]: ConquistaInterface };
    historico: { [licaoId: string]: HistoricoPortalInterface };
}

interface ResponseGetPortalAluno extends CachePortalAlunoInterface {
    licao_atual: {
        classeNome: string;
        licaoNome: string;
        data_inicio: number;
        data_fim: number;

        detalhes_aluno: DetalhesAlunoCacheLicao;
        chamada: { [alunoId: string]: ChamadaChacheLicao };
    };
}
