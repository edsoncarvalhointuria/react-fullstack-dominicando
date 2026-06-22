import "./licao-modal.scss";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import type { LicaoInterface } from "../../interfaces/LicaoInterface";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBookmark,
    faCircleCheck,
    faCircleXmark,
    faPenToSquare,
    faXmark,
    faPencil,
    faGear,
    faSquarePen,
    faChartSimple,
    faCaretLeft,
    faHandPointer,
} from "@fortawesome/free-solid-svg-icons";
import { collection, doc, getDoc, getDocs, getDocsFromCache, query, Timestamp, where } from "firebase/firestore";
import { db } from "../../utils/firebase";
import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CacheLicaoInterface } from "../../interfaces/CacheLicaoInterface";
import { houveAtualizacaoIgreja, salvarSistemaLocalStorageIgreja } from "../../utils/getSistema";
import LoadingModal from "../layout/loading/LoadingModal";

const PanoramaLicao = lazy(() => import("./PanoramaLicao"));

interface AulaDocument {
    id: string;
    numero_aula: number;
    data_prevista: Timestamp;
    realizada: boolean;
    registroRef: any;
}

const variantsContainer: Variants = {
    hidden: {},
    visible: {},
    exit: {},
};

const variantsMenu: Variants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
};

const Configuracoes = ({ onEditLicao, onGetPanorama }: { onEditLicao: () => void; onGetPanorama: () => void }) => {
    return (
        <motion.div
            className="licao-modal__header-options"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0, x: 50, y: -30 }}
        >
            <div className="licao-modal__header-option" onClick={onEditLicao}>
                <FontAwesomeIcon icon={faSquarePen} />
                <p>Editar Revista</p>
            </div>
            <motion.div className="licao-modal__header-option" onTap={onGetPanorama}>
                <FontAwesomeIcon icon={faChartSimple} />
                <p>Panorama Lição</p>
            </motion.div>
        </motion.div>
    );
};

function LicaoModal({
    licao,
    closeModal,
    editLicao,
}: {
    licao: LicaoInterface;
    closeModal: React.Dispatch<React.SetStateAction<LicaoInterface | null>>;
    editLicao: React.Dispatch<React.SetStateAction<LicaoInterface | null>>;
}) {
    const [aulasMap, setAulasMap] = useState<Map<number, AulaDocument>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [openConfig, setOpenConfig] = useState(false);
    const [isPanorama, setIsPanorama] = useState(false);
    const [panoramaDados, setPanoramaDados] = useState<CacheLicaoInterface | null>(null);
    const [loadingPanorama, setLoadingPanorama] = useState(false);
    const navigate = useNavigate();

    const getDomingo = () => {
        const hoje = new Date();
        const diff = hoje.getDay() === 0 ? 0 : 7 - hoje.getDay();
        hoje.setDate(hoje.getDate() + diff);
        return hoje;
    };
    const getPanorama = async () => {
        setLoadingPanorama(true);
        setIsPanorama(true);
        if (!panoramaDados) {
            const cacheDoc = doc(db, "cache_licao", `${licao.igrejaId}_${licao.id}`);

            try {
                const cacheSnap = await getDoc(cacheDoc);
                setPanoramaDados(cacheSnap.data() as CacheLicaoInterface);
                setLoadingPanorama(false);
            } catch (error: any) {
                console.log(error.message);
                setIsPanorama(false);
            }
        }
    };
    const goToAula = (aula: string | number) => {
        navigate(`/aulas/${licao.igrejaId}/${licao.classeId}/${licao.id}/${aula}`);
    };

    const aulasDoTrimestre = useMemo(() => {
        const dataInicio = licao.data_inicio.toDate();

        const listaAulas = Array.from({ length: licao.numero_aulas }).map((_, i) => {
            const numeroAula = i + 1;
            const dataAula = new Date(dataInicio);
            dataAula.setDate(dataAula.getDate() + i * 7);

            return {
                numero: numeroAula,
                data: dataAula,
                aulaRegistrada: aulasMap.get(numeroAula) || null,
            };
        });

        return listaAulas;
    }, [licao, aulasMap]);

    const proximaAula = useMemo(() => {
        const domingo = getDomingo().toLocaleDateString("pt-BR");
        const aula = aulasDoTrimestre.find((v) => v.data.toLocaleDateString("pt-BR") === domingo);

        return aula;
    }, [aulasDoTrimestre]);

    useEffect(() => {
        const getAulas = async () => {
            setIsLoading(true);
            try {
                const aulasCollection = collection(db, "licoes", licao.id, "aulas");
                const q = query(aulasCollection, where("realizada", "==", true));

                const houveAtualizacao = await houveAtualizacaoIgreja(
                    licao.ministerioId,
                    licao.igrejaId,
                    licao.classeId,
                    "aulas",
                );

                let docs;
                if (houveAtualizacao.houveAtualizacao) docs = await getDocs(q);
                else {
                    docs = await getDocsFromCache(q);
                    if (docs.empty) docs = await getDocs(q);
                }

                salvarSistemaLocalStorageIgreja(houveAtualizacao);

                const aulas = docs.docs.map((doc) => ({
                    id: doc.id,
                    ...(doc.data() as Omit<AulaDocument, "id">),
                }));
                setAulasMap(new Map(aulas.map((v) => [v.numero_aula, v])));
            } catch (error) {
                console.error("Erro ao buscar aulas da lição:", error);
            } finally {
                setIsLoading(false);
            }
        };
        getAulas();
    }, [licao]);
    return (
        <div className="licao-modal__overlay" onClick={() => window.history.back()}>
            <motion.div
                className={`licao-modal ${isPanorama ? "licao-modal--panorama" : ""}`}
                layoutId={licao.id}
                onClick={(e) => e.stopPropagation()}
            >
                <motion.div
                    className={`licao-modal__header ${
                        isPanorama ? "licao-modal__header--panorama" : ""
                    } ${!proximaAula ? "licao-modal__header--sem-domingo" : ""}`}
                >
                    <div className="licao-modal__header-config">
                        <div className={`licao-modal__header--close`} onClick={() => window.history.back()}>
                            <FontAwesomeIcon icon={faXmark} />
                        </div>
                        {!isPanorama && (
                            <>
                                <motion.div className="licao-modal__header--config" onTap={getPanorama}>
                                    <FontAwesomeIcon icon={faChartSimple} />
                                </motion.div>

                                <div className="licao-modal__header-menu">
                                    <div
                                        className="licao-modal__header--config"
                                        onClick={() => setOpenConfig((v) => !v)}
                                    >
                                        <FontAwesomeIcon icon={faGear} />
                                    </div>
                                    <AnimatePresence>
                                        {openConfig && (
                                            <Configuracoes
                                                onEditLicao={() => {
                                                    closeModal(null);
                                                    editLicao(licao);
                                                }}
                                                onGetPanorama={getPanorama}
                                            />
                                        )}
                                    </AnimatePresence>
                                </div>
                            </>
                        )}
                    </div>
                    <motion.div
                        variants={variantsContainer}
                        initial="hidden"
                        animate="visible"
                        layout
                        exit="exit"
                        className={`licao-modal__header-infos ${isPanorama && "licao-modal__header-infos--panorama"}`}
                    >
                        {isPanorama ? (
                            <motion.span
                                className="licao-modal__header--voltar"
                                initial={{
                                    opacity: 0,
                                }}
                                animate={{
                                    opacity: 1,
                                    transition: { delay: 0.5 },
                                }}
                                key={"voltar-licao-modal"}
                                onClick={() => setIsPanorama(false)}
                            >
                                <FontAwesomeIcon icon={faCaretLeft} />
                            </motion.span>
                        ) : (
                            <>
                                <div key={"licao-modal-titulo"} className="licao-modal__header--title">
                                    <FontAwesomeIcon icon={faBookmark} />
                                    <h3>{licao.titulo}</h3>
                                </div>

                                {proximaAula && (
                                    <motion.div
                                        variants={variantsMenu}
                                        exit={{
                                            opacity: 0,
                                            overflow: "hidden",
                                            transition: { duration: 0 },
                                        }}
                                        key={"licao-modal-iniciar-chamada"}
                                        className="licao-modal__header--nova-chamada"
                                    >
                                        <motion.button
                                            whileHover={{
                                                scale: 1.02,
                                                boxShadow: "0 5px 20px rgba(59, 130, 246, 0.3)",
                                            }}
                                            whileTap={{ scale: 0.99 }}
                                            transition={{ ease: "backOut", duration: 0.7 }}
                                            onTap={() => goToAula(proximaAula?.numero)}
                                        >
                                            <span>
                                                <FontAwesomeIcon icon={faHandPointer} />
                                            </span>
                                            <span>
                                                Fazer Chamada: <strong>Aula {proximaAula.numero}</strong>
                                                {" - "}
                                                {proximaAula?.data.toLocaleDateString("pt-BR", {
                                                    weekday: "long",
                                                    day: "2-digit",
                                                    month: "long",
                                                    year: "numeric",
                                                })}
                                            </span>
                                        </motion.button>
                                    </motion.div>
                                )}
                            </>
                        )}
                    </motion.div>
                </motion.div>

                <div className="licao-modal__body">
                    {isPanorama ? (
                        <Suspense fallback={<LoadingModal isEnviando mensagem="Carregando" />}>
                            <PanoramaLicao
                                dados={panoramaDados}
                                isLoading={loadingPanorama}
                                licao={licao}
                                listaAulas={aulasDoTrimestre}
                            />
                        </Suspense>
                    ) : (
                        <ul className="licao-modal__registros">
                            {isLoading ? (
                                <p>Carregando aulas...</p>
                            ) : (
                                <>
                                    {aulasDoTrimestre.map((aula) => (
                                        <li
                                            key={aula.numero}
                                            onClick={() => goToAula(aula.numero)}
                                            className={aula.aulaRegistrada?.realizada ? "preenchida" : "pendente"}
                                        >
                                            <div className="licao-modal__registros-infos">
                                                <p>Lição {aula.numero}</p>
                                                <data value={aula.data.toLocaleDateString("pt-BR")}>
                                                    {aula.data.toLocaleDateString("pt-BR")}
                                                </data>
                                            </div>

                                            <div className="licao-modal__registros--status">
                                                {aula.aulaRegistrada?.realizada ? (
                                                    <p className="status-concluido">
                                                        <FontAwesomeIcon icon={faCircleCheck} />
                                                        <span>Realizada</span>
                                                    </p>
                                                ) : (
                                                    <p className="status-pendente">
                                                        <FontAwesomeIcon icon={faCircleXmark} />
                                                        <span>Pendente</span>
                                                    </p>
                                                )}
                                            </div>

                                            <div className="licao-modal__registros--acao">
                                                {aula?.aulaRegistrada?.realizada ? (
                                                    <button title="Ver/Editar Chamada">
                                                        <FontAwesomeIcon icon={faPenToSquare} />
                                                    </button>
                                                ) : (
                                                    <button title="Fazer Chamada">
                                                        <FontAwesomeIcon icon={faPencil} />
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </>
                            )}
                        </ul>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

export default LicaoModal;
