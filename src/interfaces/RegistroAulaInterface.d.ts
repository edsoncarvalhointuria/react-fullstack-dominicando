import type { Timestamp } from "firebase/firestore";

export interface RegistroAulaInterface {
    id: number;
    atrasados: number;
    biblias: number;
    classeId: string;
    classeNome: string;
    data: Timestamp;
    descricao: string;
    igrejaId: string;
    igrejaNome: string;
    licaoId: string;
    licoes_trazidas: number;
    ministerioId: string;
    missoes_total: number;
    ofertas_total: number;
    presentes_chamada: number;
    total_presentes: number;
    total_matriculados: number;
    visitas: number;
    visitas_lista: VisitaFront[];
    missoes: { dinheiro: number; pix: number };
    ofertas: { dinheiro: number; pix: number };
}
