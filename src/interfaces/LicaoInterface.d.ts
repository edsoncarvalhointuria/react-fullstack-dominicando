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
}
