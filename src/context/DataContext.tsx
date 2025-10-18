import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { useAuthContext } from "./AuthContext";
import {
    collection,
    documentId,
    getDocs,
    query,
    where,
} from "firebase/firestore";
import { db } from "../utils/firebase";

const context = createContext({});
export const useDataContext = () => useContext(context) as DataContextInterface;

function DataContext({ children }: { children: ReactNode }) {
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [igrejas, setIgrejas] = useState<IgrejaInterface[]>([]);
    const [classes, setClasses] = useState<ClasseInterface[]>([]);
    const { user, isSuperAdmin, isAdmin } = useAuthContext();

    const getPastorPresidente = (collectionName: string) => {
        const c = collection(db, collectionName);
        const q = query(c, where("ministerioId", "==", user!.ministerioId));
        const docs = getDocs(q);

        return docs;
    };
    const getPastor = (collectionName: string) => {
        const c = collection(db, collectionName);
        const q = query(c, where("igrejaId", "==", user!.igrejaId));
        const docs = getDocs(q);

        return docs;
    };
    const getClasseSecretario = (collectionName: string) => {
        const c = collection(db, collectionName);
        const q = query(
            c,
            where("igrejaId", "==", user!.igrejaId),
            where(documentId(), "==", user!.classeId)
        );
        const docs = getDocs(q);

        return docs;
    };

    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            if (isSuperAdmin.current) {
                const i = await getPastorPresidente("igrejas");

                setIgrejas(
                    i.docs.map(
                        (ig) => ({ id: ig.id, ...ig.data() } as IgrejaInterface)
                    )
                );

                const c = await getPastorPresidente("classes");
                setClasses(
                    c.docs.map(
                        (cl) =>
                            ({
                                id: cl.id,
                                ...cl.data(),
                            } as ClasseInterface)
                    )
                );
            } else if (isAdmin.current) {
                const c = await getPastor("classes");
                setIgrejas([
                    {
                        id: user.igrejaId!,
                        nome: user.igrejaNome!,
                        ministerioId: user.ministerioId!,
                    },
                ]);

                setClasses(
                    c.docs.map(
                        (cl) =>
                            ({
                                id: cl.id,
                                ...cl.data(),
                            } as ClasseInterface)
                    )
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
            }}
        >
            {children}
        </context.Provider>
    );
}

export default DataContext;
