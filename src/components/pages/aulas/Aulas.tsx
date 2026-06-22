import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useDataContext } from "../../../context/DataContext";
import { useAuthContext } from "../../../context/AuthContext";
import { lazy, useEffect, useState } from "react";
import { collection, getDocs, getDocsFromCache, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../../../utils/firebase";
import type { LicaoInterface } from "../../../interfaces/LicaoInterface";
import { houveAtualizacaoIgreja, salvarSistemaLocalStorageIgreja } from "../../../utils/getSistema";
import SelectionGrid from "../../layout/selection_grid/SelectionGrid";
import LicoesGrid from "./LicoesGrid";
import Loading from "../../layout/loading/Loading";

const CadastroIgrejaModal = lazy(() => import("../../ui/CadastroIgrejaModal"));
const CadastroClasseModal = lazy(() => import("../../ui/CadastroClasseModal"));

const LIMITE = 10;

function Aulas() {
    const [isLoading, setIsLoading] = useState<boolean | null>(null);
    const [licoes, setLicoes] = useState<any[]>([]);
    const [update, setUpdate] = useState(0);
    const [limite, setLimite] = useState(LIMITE);
    const navigate = useNavigate();
    let { igrejaId, classeId } = useParams();
    const { classes, igrejas, isLoadingData, refetchData } = useDataContext();
    const { user, isSuperAdmin, isAdmin, isSecretario } = useAuthContext();

    if (!user) return <Loading />;

    const pastorPresidente = () => {
        if (!igrejaId)
            return (
                <SelectionGrid
                    opcoes={igrejas}
                    titulo="Igreja"
                    onSelect={(id: string) => navigate(`igreja/${id}`)}
                    renderAddModal={(onClose) => (
                        <CadastroIgrejaModal
                            onCancel={onClose}
                            onSave={() => {
                                refetchData();
                            }}
                        />
                    )}
                    sort={false}
                />
            );
        else if (igrejas.find((v) => igrejaId === v.id))
            return (
                <SelectionGrid
                    opcoes={classes.filter((v) => igrejaId === v.igrejaId)}
                    onSelect={(id: string) => navigate(`classe/${id}`)}
                    titulo="Classe"
                    renderAddModal={(onClose) => (
                        <CadastroClasseModal
                            onCancel={onClose}
                            onSelect={() => {
                                refetchData();
                                onClose();
                            }}
                            igrejaId={igrejaId}
                        />
                    )}
                    sort={false}
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
                    renderAddModal={(onClose) => (
                        <CadastroClasseModal
                            onCancel={onClose}
                            onSelect={() => {
                                refetchData();
                                onClose();
                            }}
                            igrejaId={user.igrejaId || undefined}
                        />
                    )}
                    sort={false}
                />
            );
    };

    useEffect(() => {
        if (!classeId || !igrejaId || !classes.length) return;

        const getLicoes = async (igreja: string, classe: string, limite: number) => {
            setIsLoading(true);
            const podeAcessar = classes.find((v) => v.id === classe) || igrejas.find((v) => v.id === igreja);
            if (!podeAcessar) return navigate("/aulas");
            const collectionLicoes = collection(db, "licoes");
            const condicoes = [
                where("classeId", "==", classe),
                where("igrejaId", "==", igreja),
                where("ministerioId", "==", user.ministerioId),
                orderBy("data_inicio", "desc"),
                limit(limite),
            ];

            const q = query(collectionLicoes, ...condicoes);

            const houveAtualizacao = await houveAtualizacaoIgreja(user.ministerioId!, igreja, classe, "licoes");

            let docs;
            if (houveAtualizacao.houveAtualizacao) docs = await getDocs(q);
            else {
                docs = await getDocsFromCache(q);
                if (docs.empty) docs = await getDocs(q);
            }

            const licoes = docs.docs
                .map((v) => ({ ...v.data(), id: v.id }) as LicaoInterface)
                .sort((a, b) => {
                    if (a.ativo) return -1;
                    if (b.ativo) return 1;

                    return b.data_inicio.toDate().getTime() - a.data_inicio.toDate().getTime();
                });

            salvarSistemaLocalStorageIgreja(houveAtualizacao);
            setLicoes(licoes);
        };

        getLicoes(igrejaId, classeId, limite).finally(() => setIsLoading(false));
    }, [classeId, update, limite, classes]);
    if (!isSuperAdmin.current && igrejaId) return <Navigate to={"/aulas"} />;
    if (isAdmin.current) igrejaId = user.igrejaId as string;
    if (isSecretario.current) {
        igrejaId = user.igrejaId as string;
        classeId = user.classeId as string;
    }
    return (
        <>
            {isLoadingData || isLoading === true ? (
                <Loading />
            ) : isLoading === false && classeId && igrejaId ? (
                <LicoesGrid
                    revistas={licoes}
                    classeId={classeId!}
                    igrejaId={igrejaId!}
                    classeNome={classes.find((v) => v.id === classeId)?.nome || ""}
                    onUpdate={() => setUpdate((v) => v + 1)}
                    limite={limite}
                    onUpdateLimit={() => setLimite((v) => v + LIMITE)}
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
