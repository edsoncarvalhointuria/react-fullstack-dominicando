import type { Timestamp } from "firebase/firestore";

interface ChamadaChacheLicao {
    status: "Presente" | "Atrasado" | "Falta Justificada" | "Falta";
    trouxe_licao: boolean;
    trouxe_biblia: boolean;
    alunoId: string;
}

interface DetalhesAulaCacheLicao {
    atrasados: number;
    ausentes: number;
    biblias: number;
    licoes: number;
    presentes_chamada: number;
    visitas: number;
    visitas_lista: VisitaFront[];
    total_presenca: number;
    ofertas: number;
    ofertas_pix: number;
    ofertas_dinheiro: number;
    missoes: number;
    missoes_dinheiro: number;
    missoes_pix: number;
    total_matriculados: number;
    descricao?: string;

    chamada: {
        [alunoId: string]: ChamadaChacheLicao;
    };
}
interface DetalhesAlunoCacheLicao {
    id?: string;
    nome: string;
    presente: number;
    atrasado: number;
    falta: number;
    falta_justificada: number;
    trouxe_biblia: number;
    trouxe_revista: number;
    nao_trouxe_biblia: number;
    nao_trouxe_revista: number;
    porcentagem_biblia: number;
    porcentagem_revista: number;
    porcentagem: number;
    matriculado: boolean;
}

interface CacheLicaoInterface {
    id: string;
    igrejaId: string;
    igrejaNome: string;
    ministerioId: string;
    classeId: string;
    classeNome: string;
    licaoId: string;
    licaoNome: string;
    data_inicio: Timestamp;
    data_fim: Timestamp;

    total_ofertas: number;
    total_ofertas_pix: number;
    total_ofertas_dinheiro: number;
    total_missoes: number;
    total_missoes_dinheiro: number;
    total_missoes_pix: number;

    pico_presenca: number;
    total_matriculados: number;
    detalhes_aulas: { [idAluno: string]: DetalhesAulaCacheLicao };
    detalhes_aluno: { [data: string]: DetalhesAlunoCacheLicao };
}
