import type { Timestamp } from "firebase/firestore";

interface TextType {
    tipo: "text";
    titulo: string;
    obrigatorio: boolean;
    idKey: string | number;
    resposta?: string | number;
}

interface RevistaType {
    idKey: string | number;
    tipo: "revista";
    tipoRevista: string;
    titulo?: string;
    rotuloId: string;
    preco_unitario: number;
    obrigatorio: boolean;
    resposta?: string | number;
}

interface PedidosEstrutura {
    estrutura: {
        titulo?: string;
        idKey: string;
        campos: (RevistaType | TextType)[];
    }[];
}

interface PedidosInterface {
    id?: string;
    titulo: string;
    descricao?: string;
    data_inicio: Timestamp;
    data_fim: Timestamp;
    tipo: "modelo" | "formulario";
    nomeModelo?: string;
    ministerioId: string;
}

interface PedidosRespostas {
    id: string;
    ministerioId: string;
    igrejaId: string;
    estrutura: { [idKey: string]: TextType | RevistaType };
    total_ofertas: number;
    data_resposta: Timestamp;
    modeloId: string;
    envido_por: {
        email: string;
        nome: string;
    };
}
