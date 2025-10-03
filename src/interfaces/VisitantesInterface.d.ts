import type { Timestamp } from "firebase/firestore";

interface VisitanteInterface {
    contato: string | null;
    data_nascimento: Timestamp;
    igrejaId: string;
    igrejaNome: string;
    ministerioId: string;
    nome_completo: string;
    primeira_visita: Timestamp;
    ultima_visita: Timestamp;
    quantidade_visitas: number;
    id: string;
}
