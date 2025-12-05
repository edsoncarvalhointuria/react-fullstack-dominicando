import type { Timestamp } from "firebase/firestore";

interface TrimestresInterface {
    id: string;
    ano: number;
    data_fim: Timestamp;
    data_inicio: Timestamp;
    ministerioId: string;
    nome: string;
    numero_trimestre: number;
}
