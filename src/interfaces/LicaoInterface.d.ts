import type { Timestamp } from "firebase/firestore";

interface LicaoInterface {
    id: string;
    ativo: boolean;
    img: string | null;
    classeId: string;
    classeNome: string;
    data_fim: Timestamp;
    data_inicio: Timestamp;
    igrejaId: string;
    igrejaNome: string;
    ministerioId: string;
    numero_aulas: number;
    numero_trimestre: number | null;
    titulo: string;
    total_matriculados: number;
    relatorio_enviado?: boolean;
    licaoGlobalId?: string;
    primeiroAcesso?: boolean;
    pdf?: string | null;
}

interface LicaoGlobalInterface {
    id: string;
    ativo: boolean;
    img: string | null;
    pdf: string | null;
    rotuloId: string;
    data_fim: Timestamp;
    data_inicio: Timestamp;
    ministerioId: string;
    numero_aulas: number;
    numero_trimestre: number;
    titulo: string;
    igrejas: string[];
}
