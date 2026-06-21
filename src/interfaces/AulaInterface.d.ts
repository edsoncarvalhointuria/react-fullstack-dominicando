import type { ReferenceType } from "firebase/data-connect";
import type { Timestamp } from "firebase/firestore";

interface AulaInterface {
    ministerioId: string;
    igrejaId: string;
    classeId: string;
    data_prevista: Timestamp;
    numero_aula: number;
    realizada: boolean;
    registroRef: ReferenceType<DocumentType>;
}
