import { AnimatePresence, motion, type Variants } from "framer-motion";
import "./licao-modal.scss";
import type { LicaoInterface } from "../../interfaces/LicaoInterface";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBookmark,
    faCircleCheck,
    faCircleXmark,
    faTimeline,
    faPenToSquare,
    faXmark,
    faPencil,
    faGear,
    faSquarePen,
    faChartSimple,
    faCaretLeft,
} from "@fortawesome/free-solid-svg-icons";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PanoramaLicao from "./PanoramaLicao";
import { getFunctions, httpsCallable } from "firebase/functions";

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

const functions = getFunctions();
const getResumoDaLicao = httpsCallable(functions, "getResumoDaLicao");

function LicaoModal({
    licao,
    closeModal,
    editLicao,
}: {
    licao: LicaoInterface;
    closeModal: React.Dispatch<React.SetStateAction<LicaoInterface | null>>;
    editLicao: React.Dispatch<React.SetStateAction<LicaoInterface | null>>;
}) {
    const [aulasRegistradas, setAulasRegistradas] = useState<AulaDocument[]>(
        []
    );
    const [isLoading, setIsLoading] = useState(true);
    const [openConfig, setOpenConfig] = useState(false);
    const [isPanorama, setIsPanorama] = useState(false);
    const [panoramaDados, setPanoramaDados] = useState<any | null>(null);
    const [loadingPanorama, setLoadingPanorama] = useState(false);
    const navigate = useNavigate();

    const aulasMap = useMemo(() => {
        const map = new Map<number, AulaDocument>();
        aulasRegistradas.forEach((aula) => {
            map.set(aula.numero_aula, aula);
        });
        return map;
    }, [aulasRegistradas]);

    const getDomingo = () => {
        const hoje = new Date();
        const diff = hoje.getDay() === 0 ? 0 : 7 - hoje.getDay();
        hoje.setDate(hoje.getDate() + diff);
        return hoje;
    };

    const aulasDoTrimestre = useMemo(() => {
        const dataInicio = licao.data_inicio.toDate();

        const listaAulas = Array.from({ length: licao.numero_aulas }).map(
            (_, i) => {
                const numeroAula = i + 1;
                const dataAula = new Date(dataInicio);
                dataAula.setDate(dataAula.getDate() + i * 7);

                return {
                    numero: numeroAula,
                    data: dataAula,
                    aulaRegistrada: aulasMap.get(numeroAula) || null,
                };
            }
        );

        return listaAulas;
    }, [licao, aulasMap]);

    const domingoAtual = useMemo(() => {
        const domingo = getDomingo().toLocaleDateString("pt-BR");
        const aula = aulasDoTrimestre.find(
            (v) => v.data.toLocaleDateString("pt-BR") === domingo
        );

        return aula;
    }, [aulasDoTrimestre]);

    useEffect(() => {
        const getAulas = async () => {
            setIsLoading(true);
            try {
                const aulasCollection = collection(
                    db,
                    "licoes",
                    licao.id,
                    "aulas"
                );
                const aulasSnapshot = await getDocs(aulasCollection);
                const aulas = aulasSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...(doc.data() as Omit<AulaDocument, "id">),
                }));
                setAulasRegistradas(aulas);
            } catch (error) {
                console.error("Erro ao buscar aulas da lição:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (licao.id) {
            setLoadingPanorama(true);
            getResumoDaLicao({ licaoId: licao.id })
                .then(({ data }) => {
                    setPanoramaDados(data);
                    setLoadingPanorama(false);
                })
                .catch((err) => console.log(err));
        }
        getAulas();
    }, [licao.id]);
    return (
        <motion.div className="licao-modal" layoutId={licao.id}>
            <motion.div
                layout
                className={`licao-modal__header ${
                    isPanorama && "licao-modal__header--panorama"
                }`}
            >
                <div className="licao-modal__header-config">
                    <div
                        className={`licao-modal__header--close`}
                        onClick={() => closeModal(null)}
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </div>
                    {!isPanorama && (
                        <div className="licao-modal__header-menu">
                            <div
                                className="licao-modal__header--config"
                                onClick={() => setOpenConfig((v) => !v)}
                            >
                                <FontAwesomeIcon icon={faGear} />
                            </div>
                            <AnimatePresence>
                                {openConfig && (
                                    <motion.div
                                        className="licao-modal__header-options"
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{
                                            opacity: 0,
                                            scale: 0,
                                            x: 50,
                                            y: -30,
                                        }}
                                    >
                                        <div
                                            className="licao-modal__header-option"
                                            onClick={() => {
                                                closeModal(null);
                                                editLicao(licao);
                                            }}
                                        >
                                            <FontAwesomeIcon
                                                icon={faSquarePen}
                                            />
                                            <p>Editar Revista</p>
                                        </div>
                                        <div
                                            className="licao-modal__header-option"
                                            onClick={() => setIsPanorama(true)}
                                        >
                                            <FontAwesomeIcon
                                                icon={faChartSimple}
                                            />
                                            <p>Panorama Lição</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
                <motion.div
                    variants={variantsContainer}
                    initial="hidden"
                    animate="visible"
                    layout
                    exit="exit"
                    className={`licao-modal__header-infos ${
                        isPanorama && "licao-modal__header-infos--panorama"
                    }`}
                >
                    <AnimatePresence>
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
                                <motion.div
                                    variants={variantsMenu}
                                    key={"licao-modal-titulo"}
                                    className="licao-modal__header--title"
                                    exit={{ y: 10, opacity: 0 }}
                                >
                                    <FontAwesomeIcon icon={faBookmark} />
                                    <h3>{licao.titulo}</h3>
                                </motion.div>

                                {domingoAtual && (
                                    <motion.div
                                        variants={variantsMenu}
                                        exit={{ y: 10, opacity: 0 }}
                                        key={"licao-modal-iniciar-chamada"}
                                        className="licao-modal__header--nova-chamada"
                                    >
                                        <motion.button
                                            whileHover={{
                                                y: -2,
                                                boxShadow:
                                                    "0 5px 20px rgba(59, 130, 246, 0.3)",
                                            }}
                                            whileTap={{ scale: 0.8 }}
                                            onTap={() =>
                                                navigate(
                                                    `/aulas/${licao.igrejaId}/${licao.classeId}/${licao.id}/${domingoAtual?.numero}`
                                                )
                                            }
                                            transition={{ duration: 0.2 }}
                                        >
                                            <span>
                                                <FontAwesomeIcon
                                                    icon={faTimeline}
                                                />
                                            </span>
                                            <span>
                                                Iniciar chamada de{" "}
                                                {domingoAtual?.data.toLocaleDateString(
                                                    "pt-BR",
                                                    {
                                                        weekday: "long",
                                                        day: "2-digit",
                                                        month: "long",
                                                        year: "numeric",
                                                    }
                                                )}
                                            </span>
                                        </motion.button>
                                    </motion.div>
                                )}
                            </>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>

            <div className="licao-modal__body">
                {isPanorama ? (
                    <PanoramaLicao
                        dados={panoramaDados}
                        isLoading={loadingPanorama}
                        igrejaNome={licao.igrejaNome}
                        classeNome={licao.classeNome}
                        licaoNome={licao.titulo}
                    />
                ) : (
                    <ul className="licao-modal__registros">
                        {isLoading ? (
                            <p>Carregando aulas...</p>
                        ) : (
                            aulasDoTrimestre.map((aula) => (
                                <li
                                    key={aula.numero}
                                    onClick={() =>
                                        navigate(
                                            `/aulas/${licao.igrejaId}/${licao.classeId}/${licao.id}/${aula.numero}`
                                        )
                                    }
                                    className={
                                        aula.aulaRegistrada?.realizada
                                            ? "preenchida"
                                            : "pendente"
                                    }
                                >
                                    <div className="licao-modal__registros-infos">
                                        <p>Lição {aula.numero}</p>
                                        <data
                                            value={aula.data.toLocaleDateString(
                                                "pt-BR"
                                            )}
                                        >
                                            {aula.data.toLocaleDateString(
                                                "pt-BR"
                                            )}
                                        </data>
                                    </div>

                                    <div className="licao-modal__registros--status">
                                        {aula.aulaRegistrada?.realizada ? (
                                            <p className="status-concluido">
                                                <FontAwesomeIcon
                                                    icon={faCircleCheck}
                                                />
                                                <span>Realizada</span>
                                            </p>
                                        ) : (
                                            <p className="status-pendente">
                                                <FontAwesomeIcon
                                                    icon={faCircleXmark}
                                                />
                                                <span>Pendente</span>
                                            </p>
                                        )}
                                    </div>

                                    <div className="licao-modal__registros--acao">
                                        {aula?.aulaRegistrada?.realizada ? (
                                            <button title="Ver/Editar Chamada">
                                                <FontAwesomeIcon
                                                    icon={faPenToSquare}
                                                />
                                            </button>
                                        ) : (
                                            <button title="Fazer Chamada">
                                                <FontAwesomeIcon
                                                    icon={faPencil}
                                                />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                )}
            </div>

            <div
                className="licao-modal--close"
                onClick={() => closeModal(null)}
            ></div>
        </motion.div>
    );
}

export default LicaoModal;
