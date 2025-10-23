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
