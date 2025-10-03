import type { Timestamp } from "firebase/firestore";

interface AlunoInterface {
    id: string;
    data_nascimento: Timestamp;
    igrejaId: string;
    igrejaNome: string;
    ministerioId: string;
    nome_completo: string;
    contato: string | null;
    isMembro: boolean;
    membroId: string | null;
}
