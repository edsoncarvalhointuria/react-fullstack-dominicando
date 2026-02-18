import type { Timestamp } from "firebase/firestore";

interface ListaNotificacao {
    ministerioId: string;
    alunoId: string;
    igrejaId: string;
    alunoNome: string;
    data_nascimento: Timestamp;
    data_encerramento: Timestamp;
}
interface NotificacaoInterface {
    igrejaId: string;
    ministerioId: string;
    vazio: boolean;

    lista: { [alunoId: string]: ListaNotificacao };
}
