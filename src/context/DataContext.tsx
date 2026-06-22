import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuthContext } from "./AuthContext";
import { collection, doc, documentId, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../utils/firebase";
import type { ListaNotificacao } from "../interfaces/NotificacaoInterface";
import type { DataContextInterface } from "../interfaces/DataContextInterface";
import type { CacheAlunoInteface } from "../interfaces/AlunoInterface";

const context = createContext({});
export const useDataContext = () => useContext(context) as DataContextInterface;

function DataContext({ children }: { children: ReactNode }) {
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [igrejas, setIgrejas] = useState<IgrejaInterface[]>([]);
    const [classes, setClasses] = useState<ClasseInterface[]>([]);
    const [notificacoes, setNotificacoes] = useState<ListaNotificacao[]>([]);
    const { user, isSuperAdmin, isAdmin } = useAuthContext();

    const getPastorPresidente = (collectionName: string) => {
        const c = collection(db, collectionName);
        const q = query(c, where("ministerioId", "==", user!.ministerioId));
        const docs = getDocs(q);

        return docs;
    };
    const getClasseSecretario = (collectionName: string) => {
        const c = collection(db, collectionName);
        const q = query(c, where("igrejaId", "==", user!.igrejaId), where(documentId(), "==", user!.classeId));
        const docs = getDocs(q);

        return docs;
    };
    const removerNotificacoes = useCallback(
        (...args: string[]) => {
            if (!user) return;
            const listaRemovidos = JSON.parse(localStorage.getItem("notificacoes_removidas") || "[]") as string[];
            const todos = [...listaRemovidos, ...args];
            setNotificacoes((v) => v.filter((v) => !todos.includes(v.alunoId)));
            localStorage.setItem("notificacoes_removidas", JSON.stringify(todos));
        },
        [user],
    );

    const fetchNotificacoes = useCallback(async () => {
        if (!user) return;
        const hoje = new Date();
        const ultimaPesquisa = JSON.parse(localStorage.getItem("ultima_pesquisa_notificacoes") || "{}");
        if (hoje.toLocaleDateString("pt-BR") === ultimaPesquisa.data && ultimaPesquisa.dados?.length) {
            const notificacoes = ultimaPesquisa.dados as ListaNotificacao[];
            setNotificacoes(notificacoes);
            return;
        }

        const alunosDoc = doc(db, "cache_alunos", user.igrejaId!);
        const alunoSnap = await getDoc(alunosDoc);
        const alunosData = alunoSnap.data() as CacheAlunoInteface;
        const listaAlunos = Object.values(alunosData.lista);
        const notificacoesRemovidas = JSON.parse(localStorage.getItem("notificacoes_removidas") || "[]") as string[];

        hoje.setHours(0, 0, 0, 0);
        const alvo = new Date(hoje);
        alvo.setDate(alvo.getDate() + 1);
        hoje.setDate(hoje.getDate() - 1);

        const listaAniversariantes = listaAlunos.filter((v) => {
            const dataNascimento = v.data_nascimento.toDate();
            dataNascimento.setFullYear(hoje.getFullYear());
            dataNascimento.setHours(0, 0, 0, 0);
            const isData = dataNascimento >= hoje && dataNascimento <= alvo;
            return isData;
        });

        const listaNotificacoesAtualizada = notificacoesRemovidas.filter((v) =>
            listaAniversariantes.find((a) => a.id === v),
        );

        const listaNotificacoes: ListaNotificacao[] = listaAniversariantes
            .filter((v) => !listaNotificacoesAtualizada.includes(v.id))
            .map((v) => ({
                alunoId: v.id,
                alunoNome: v.nome_completo,
                data_encerramento: v.data_nascimento,
                data_nascimento: v.data_nascimento,
                igrejaId: v.igrejaId,
                ministerioId: v.ministerioId,
            }))
            .sort((a, b) => {
                const ano = hoje.getFullYear();
                const dataA = a.data_nascimento.toDate();
                dataA.setFullYear(ano);
                const dataB = b.data_nascimento.toDate();
                dataB.setFullYear(ano);
                return dataB.getTime() - dataA.getTime();
            });

        localStorage.setItem("notificacoes_removidas", JSON.stringify(listaNotificacoesAtualizada));
        localStorage.setItem(
            "ultima_pesquisa_notificacoes",
            JSON.stringify({
                data: new Date().toLocaleDateString("pt-BR"),
                dados: listaNotificacoes,
            }),
        );

        setNotificacoes(listaNotificacoes);
    }, [user]);
    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            if (isSuperAdmin.current) {
                const [igrejas, classes] = await Promise.all([
                    getPastorPresidente("igrejas"),
                    getPastorPresidente("cache_classes"),
                ]);
                setIgrejas(
                    igrejas.docs
                        .map(
                            (ig) =>
                                ({
                                    id: ig.id,
                                    ...ig.data(),
                                }) as IgrejaInterface,
                        )
                        .sort((a, b) =>
                            a.id === user?.igrejaId ? -1 : b.id === user?.igrejaId ? 1 : a.nome.localeCompare(b.nome),
                        ),
                );

                const c = classes.docs.flatMap((v) => Object.values(v.data()?.lista));
                setClasses(
                    (c as ClasseInterface[]).sort((a, b) =>
                        a.id === user?.classeId ? -1 : b.id === user?.classeId ? 1 : a.nome.localeCompare(b.nome),
                    ),
                );
            } else if (isAdmin.current) {
                const classesDoc = doc(db, "cache_classes", user.igrejaId!);
                const classesSnap = await getDoc(classesDoc);
                const classes = Object.values(classesSnap.data()?.lista);

                setIgrejas([
                    {
                        id: user.igrejaId!,
                        nome: user.igrejaNome!,
                        ministerioId: user.ministerioId!,
                    },
                ]);

                setClasses(
                    (classes as ClasseInterface[]).sort((a, b) =>
                        a.id === user?.classeId ? -1 : b.id === user?.classeId ? 1 : a.nome.localeCompare(b.nome),
                    ),
                );
            } else {
                const c = await getClasseSecretario("classes");

                setIgrejas([
                    {
                        id: user.igrejaId!,
                        nome: user.igrejaNome!,
                        ministerioId: user.ministerioId!,
                    },
                ]);
                setClasses([
                    {
                        id: c.docs[0].id,
                        ...c.docs[0].data(),
                    } as ClasseInterface,
                ]);
            }
        } catch (err) {
            console.log("Erro ao carregar os dados", err);
        } finally {
            setIsLoadingData(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotificacoes();
    }, [fetchNotificacoes]);
    useEffect(() => {
        fetchData();
    }, [fetchData]);
    return (
        <context.Provider
            value={{
                igrejas,
                setIgrejas,
                classes,
                setClasses,
                isLoadingData,
                refetchData: fetchData,
                notificacoes,
                removerNotificacoes,
                fetchNotificacoes,
            }}
        >
            {children}
        </context.Provider>
    );
}

export default DataContext;
