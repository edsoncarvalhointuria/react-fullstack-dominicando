import type { ReferenceType } from "firebase/data-connect";
import type { Timestamp } from "firebase/firestore";

interface LicaoPreparoInterface {
    id: string;
    data_inicio: Timestamp;
    data_final: Timestamp;
    numero_aulas: number;
    ministerioId: string;
    titulo: string;
    trimestre: number;
    img?: string;
    status_aulas: { [key: string]: boolean };
    ativo: boolean;
    ultima_aula: null | ReferenceType;
}

interface AulaPreparo {
    aula: string;
    titulo_aula: string | null;
    link_youtube: string | null;
    trimestre: string;
    total_visualizacoes: number;
    realizado: boolean;
    licaoId?: string;
    ministerioId: string;
}
