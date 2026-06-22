import "./preparo.scss";
import { faBookmark, faCalendarDay, faCloudArrowUp } from "@fortawesome/free-solid-svg-icons";
import "@/components/ui/licao-card.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import SearchInput from "../../ui/SearchInput";
import { useAuthContext } from "../../../context/AuthContext";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { collection, getDocs, getDocsFromCache, limit, query, where } from "firebase/firestore";
import { db } from "../../../utils/firebase";
import type { LicaoPreparoInterface } from "../../../interfaces/LicaoPreparoInterface";
import LicaoPreparoCard from "../../ui/LicaoPreparoCard";
import LicaoPreparoModal from "../../ui/LicaoPreparoModal";
import { useNavigate } from "react-router-dom";
import { houveAtualizacaoMinisterio, salvarSistemaLocalStorageMinisterio } from "../../../utils/getSistema";
import Loading from "../../layout/loading/Loading";
import ModalSkeleton from "../../ui/ModalSkeleton";

const NovoTrimestreAulasModal = lazy(() => import("../../ui/NovoTrimestreAulasModal"));

const LIMITE_LICOES = 10;

function Preparo() {
    const [novoTrimestre, setNovoTrimestre] = useState(false);
    const [update, setUpdate] = useState(false);
    const [licoes, setLicoes] = useState<LicaoPreparoInterface[]>([]);
    const [openLicao, setOpenLicao] = useState<LicaoPreparoInterface | null>(null);
    const [editLicao, setEditLicao] = useState<LicaoPreparoInterface | null>(null);
    const [pesquisa, setPesquisa] = useState("");
    const [vazio, setVazio] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const { isSuperAdmin, user } = useAuthContext();

    const licoesMemo = useMemo(() => {
        let l = licoes;

        if (pesquisa)
            l = l.filter(
                (v) =>
                    v.titulo.toLowerCase().includes(pesquisa) ||
                    v.data_inicio.toDate().toLocaleDateString().includes(pesquisa) ||
                    `${v.trimestre} trimestre de ${v.data_inicio.toDate().getFullYear()}`.includes(pesquisa),
            );
        return l;
    }, [licoes, pesquisa]);

    useEffect(() => {
        if (isSuperAdmin.current) return;
        const getCurrentLicao = async () => {
            setIsLoading(true);
            const licaoCll = collection(db, "licoes_preparo");
            const q = query(
                licaoCll,
                where("ministerioId", "==", user?.ministerioId),
                where("ativo", "==", true),
                limit(1),
            );
            const licaoDocs = await getDocs(q);

            if (licaoDocs.empty) {
                setIsLoading(false);
                setVazio(true);
                return;
            }

            const licaoSnap = licaoDocs.docs[0];
            const licaoId = licaoSnap?.id;
            const aulaId = licaoSnap.data()?.ultima_aula?.id || 1;

            navigate(`licao/${licaoId}/aula/${aulaId}`);
        };

        getCurrentLicao();
    }, [user]);
    useEffect(() => {
        if (!isSuperAdmin.current) return;

        const getLicoes = async () => {
            setIsLoading(true);
            const licoesCll = collection(db, "licoes_preparo");
            const q = query(licoesCll, where("ministerioId", "==", user?.ministerioId), limit(LIMITE_LICOES));

            const houveAtualizacao = await houveAtualizacaoMinisterio(user?.ministerioId!, "preparo");
            let docs;
            if (houveAtualizacao.houveAtualizacao) docs = await getDocs(q);
            else {
                docs = await getDocsFromCache(q);
                if (docs.empty) docs = await getDocs(q);
            }
            salvarSistemaLocalStorageMinisterio(houveAtualizacao);

            if (docs.empty) return [];

            const licoes = docs.docs.map((v) => ({ id: v?.id, ...v.data() }) as LicaoPreparoInterface);

            const licaoAtiva = licoes.find((v) => v.ativo);

            return licoes.sort((a, b) => {
                if (licaoAtiva && licaoAtiva.id === a.id) return -1;
                if (licaoAtiva && licaoAtiva.id === b.id) return 1;

                return (b.data_inicio.toDate() as any) - (a.data_inicio.toDate() as any);
            });
        };

        const popstate = () => {
            setEditLicao(null);
            setNovoTrimestre(false);
            setOpenLicao(null);
        };
        window.addEventListener("popstate", popstate);

        getLicoes()
            .then((v) => {
                setLicoes(v);
            })
            .catch((error: any) => console.log("deu esse erro", error))
            .finally(() => setIsLoading(false));

        return () => window.removeEventListener("popstate", popstate);
    }, [user, update]);

    if (isLoading) return <Loading />;
    return (
        <>
            <div className="preparo">
                {vazio ? (
                    <div className="preparo__sem-aulas">
                        <p>
                            <span>
                                <FontAwesomeIcon icon={faCloudArrowUp} />
                            </span>
                            Não foi adicionada nenhuma aula para este trimestre.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="preparo__header">
                            <div className="preparo__title">
                                <span>
                                    <FontAwesomeIcon icon={faBookmark} />
                                </span>
                                <h2>Preparo para Aulas</h2>
                            </div>

                            <div className="preparo__acoes">
                                <div className="preparo__buttons">
                                    <button
                                        title="Iniciar Novo Trimestre"
                                        onClick={() => {
                                            setNovoTrimestre(true);
                                            window.history.pushState({ modal: true }, "");
                                        }}
                                    >
                                        <span>
                                            <FontAwesomeIcon icon={faCalendarDay} />
                                        </span>{" "}
                                        Iniciar novo trimestre
                                    </button>
                                </div>

                                <div className="preparo__pesquisa">
                                    <SearchInput texto="Trimestre" onSearch={setPesquisa} />
                                </div>
                            </div>
                        </div>

                        <div className="preparo__grid">
                            {licoesMemo.length > 0 ? (
                                licoesMemo.map((v) => (
                                    <LicaoPreparoCard key={v?.id} licao={v} openModal={setOpenLicao} />
                                ))
                            ) : (
                                <motion.div
                                    className="preparo__grid--vazio"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <p>Nenhuma lição encontrada</p>
                                </motion.div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <Suspense fallback={<ModalSkeleton />}>
                <AnimatePresence>
                    {(novoTrimestre || editLicao) && (
                        <NovoTrimestreAulasModal
                            onClose={() => {
                                setNovoTrimestre(false);
                                setEditLicao(null);
                            }}
                            onSave={() => {
                                setEditLicao(null);
                                setUpdate((v) => !v);
                            }}
                            licaoPreparoRef={editLicao}
                            key={"Novo-Trimestre-Modal"}
                        />
                    )}
                    {openLicao && (
                        <LicaoPreparoModal
                            licao={openLicao}
                            editLicao={(licao) => {
                                setEditLicao(licao);
                                setOpenLicao(null);
                            }}
                            closeModal={() => {
                                setEditLicao(null);
                                setOpenLicao(null);
                            }}
                            key={"Licao-Preparo-Modal"}
                        />
                    )}
                </AnimatePresence>
            </Suspense>
        </>
    );
}

export default Preparo;
