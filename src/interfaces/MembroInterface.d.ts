import type { Timestamp } from "firebase/firestore";

interface MembroInterface {
    id: string;
    data_nascimento: Timestamp;
    igrejaId: string;
    ministerioId: string;
    nome_completo: string;
    contato: string | null;
    validade: Timestamp;
    registro: string;
    igrejaNome: string;
    alunoId: string | null;
}
