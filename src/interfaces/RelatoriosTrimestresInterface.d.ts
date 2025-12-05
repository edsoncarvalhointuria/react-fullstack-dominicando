import type { Timestamp } from "firebase/firestore";

interface RelatoriosTrimestresInterface {
    id: string;
    data_envio: Timestamp;
    assinado_por: {
        nome: string;
        email: string;
        uid: string;
        ip: string;
    };
    total: number;
    total_ofertas_pix: number;
    total_ofertas_dinheiro: number;
    total_missoes_pix: number;
    total_missoes_dinheiro: number;
    igrejaId: string;
    ministerioId: string;
    data_inicio: Timestamp;
    data_fim: Timestamp;
    bloqueado: boolean;
    valor_enviado: number;
    descricao?: string;
}
