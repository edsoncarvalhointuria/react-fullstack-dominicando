import type { ListaNotificacao } from "./NotificacaoInterface";

interface DataContextInterface {
    igrejas: IgrejaInterface[];
    setIgrejas: React.Dispatch<
        React.SetStateAction<
            {
                id: string;
                nome: string;
            }[]
        >
    >;
    classes: ClasseInterface[];
    setClasses: React.Dispatch<
        React.SetStateAction<
            {
                id: string;
                nome: string;
            }[]
        >
    >;
    isLoadingData: boolean;
    refetchData: () => void;
    notificacoes: ListaNotificacao[];
    removerNotificacoes: (...args: string[]) => void;
    fetchNotificacoes: () => void;
}
