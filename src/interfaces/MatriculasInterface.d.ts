import type { ReferenceType } from "firebase/data-connect";
import type { Timestamp } from "firebase/firestore";

interface MatriculasInterface {
    id: string;
    alunoNome: string;
    alunoId: string;
    classeId: string;
    classeNome: string;
    classeRef: ReferenceType;
    data_matricula: Timestamp;
    igrejaId: string;
    igrejaNome: string;
    licaoId: string;
    licaoNome: string;
    licaoRef: ReferenceType;
    ministerioId: string;
    possui_revista: boolean;
}
