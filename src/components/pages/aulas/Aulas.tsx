import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useDataContext } from "../../../context/DataContext";
import SelectionGrid from "../../layout/selection_grid/SelectionGrid";
import { useAuthContext } from "../../../context/AuthContext";
import { useEffect, useState } from "react";
import {
    collection,
    doc,
    documentId,
    getDoc,
    getDocs,
    query,
    where,
} from "firebase/firestore";
import { db } from "../../../utils/firebase";
import Loading from "../../layout/loading/Loading";
import LicoesGrid from "./LicoesGrid";
import CadastroIgrejaModal from "../../ui/CadastroIgrejaModal";
import CadastroClasseModal from "../../ui/CadastroClasseModal";
import type { LicaoInterface } from "../../../interfaces/LicaoInterface";

function Aulas() {
    const [isLoading, setIsLoading] = useState<boolean | null>(null);
    const [licoes, setLicoes] = useState<any[]>([]);
    const [update, setUpdate] = useState(0);
    const navigate = useNavigate();
    let { igrejaId, classeId } = useParams();
    const { classes, igrejas, isLoadingData, refetchData } = useDataContext();
    const { user, isSuperAdmin, isAdmin, isSecretario } = useAuthContext();

    if (!user) return <Loading />;

    const getLicoes = async (igreja: string, classe: string) => {
        setIsLoading(true);
        const docIgreja = doc(db, "igrejas", igreja);
        const classeCll = collection(db, "classes");
        const queryClasse = query(
            classeCll,
            where(documentId(), "==", classe),
            !isSuperAdmin.current
                ? where("igrejaId", "==", user.igrejaId)
                : where("ministerioId", "==", user.ministerioId)
        );

        const [docSnapI, docSnapC] = await Promise.all([
            getDoc(docIgreja),
            getDocs(queryClasse),
        ]);

        if (docSnapC.empty || !docSnapI.exists()) return navigate("/aulas");

        const collectionLicoes = collection(db, "licoes");
        const q = query(
            collectionLicoes,
            where("classeId", "==", classe),
            !isSuperAdmin.current
                ? where("igrejaId", "==", user.igrejaId)
                : where("ministerioId", "==", user.ministerioId)
        );
        const docs = await getDocs(q);
        const licoes = docs.docs.map(
            (v) => ({ ...v.data(), id: v.id } as LicaoInterface)
        );
        const licaoAtiva = licoes.splice(
            licoes.findIndex((v) => v.ativo),
            1
        );

        setLicoes([
            ...licaoAtiva,
            ...licoes.sort(
                (a, b) =>
                    (b.data_inicio.toDate() as any) -
                    (a.data_inicio.toDate() as any)
            ),
        ]);
    };
    const pastorPresidente = () => {
        if (!igrejaId)
            return (
                <SelectionGrid
                    opcoes={igrejas}
                    titulo="Igreja"
                    onSelect={(id: string) => navigate(`igreja/${id}`)}
                    renderAddModal={(onClose: () => void) => (
                        <CadastroIgrejaModal
                            onCancel={() => onClose()}
                            onSave={() => {
                                refetchData();
                            }}
                        />
                    )}
                />
            );
        else if (igrejas.find((v) => igrejaId === v.id))
            return (
                <SelectionGrid
                    opcoes={classes.filter((v) => igrejaId === v.igrejaId)}
                    onSelect={(id: string) => navigate(`classe/${id}`)}
                    titulo="Classe"
                    renderAddModal={(onClose: () => void) => (
                        <CadastroClasseModal
                            onCancel={() => onClose()}
                            onSelect={() => {
                                refetchData();
                                onClose();
                            }}
                            igrejaId={igrejaId}
                        />
                    )}
                />
            );
        else return <Navigate to={"/aulas"} />;
    };
    const pastor = () => {
        if (!classeId)
            return (
                <SelectionGrid
                    opcoes={classes}
                    onSelect={(id: string) => navigate(`classe/${id}`)}
                    titulo="Classe"
                    renderAddModal={(onClose: () => void) => (
                        <CadastroClasseModal
                            onCancel={() => onClose()}
                            onSelect={() => {
                                refetchData();
                                onClose();
                            }}
                            igrejaId={user.igrejaId || undefined}
                        />
                    )}
                />
            );
    };

    if (!isSuperAdmin.current && igrejaId) return <Navigate to={"/aulas"} />;
    if (isSecretario.current) {
        igrejaId = user.igrejaId as string;
        classeId = user.classeId as string;
    }
    if (isAdmin.current) igrejaId = user.igrejaId as string;

    useEffect(() => {
        if (classeId && igrejaId)
            getLicoes(igrejaId, classeId).finally(() => setIsLoading(false));
    }, [classeId, update]);

    return (
        <>
            {isLoadingData || isLoading === true ? (
                <Loading />
            ) : isLoading === false ? (
                <LicoesGrid
                    revistas={licoes}
                    classeId={classeId!}
                    igrejaId={igrejaId!}
                    classeNome={
                        classes.find((v) => v.id === classeId)?.nome || ""
                    }
                    onUpdate={() => setUpdate((v) => v + 1)}
                />
            ) : isSuperAdmin.current ? (
                pastorPresidente()
            ) : isAdmin.current ? (
                pastor()
            ) : (
                <Loading />
            )}
        </>
    );
}

export default Aulas;
