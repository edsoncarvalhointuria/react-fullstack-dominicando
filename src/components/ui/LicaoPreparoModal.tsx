import { AnimatePresence, motion, type Variants } from "framer-motion";
import "./licao-modal.scss";
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
} from "@fortawesome/free-solid-svg-icons";

import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import type { LicaoPreparoInterface } from "../../interfaces/LicaoPreparoInterface";
import { useAuthContext } from "../../context/AuthContext";

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

function LicaoPreparoModal({
    licao,
    closeModal,
    editLicao,
}: {
    licao: LicaoPreparoInterface;
    closeModal: () => void;
    editLicao: (licao: LicaoPreparoInterface) => void;
}) {
    const [openConfig, setOpenConfig] = useState(false);
    const { isSuperAdmin } = useAuthContext();
    const navigate = useNavigate();

    const getDomingo = () => {
        const hoje = new Date();
        const diff = hoje.getDay() === 0 ? 0 : 7 - hoje.getDay();
        hoje.setDate(hoje.getDate() + diff);
        return hoje;
    };
    const aulasMap = useMemo(() => {
        const map = new Map(
            Object.entries(licao.status_aulas).map(([key, status]) => [
                key,
                status,
            ])
        );
        return map;
    }, []);
    const aulasDoTrimestre = useMemo(() => {
        const dataInicio = licao.data_inicio.toDate();

        const listaAulas = Array.from({ length: licao.numero_aulas }).map(
            (_, i) => {
                const numeroAula = String(i + 1);
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

    if (!isSuperAdmin.current) return <Navigate to={"/preparo"} />;
    return (
        <motion.div className="licao-modal" layoutId={licao.id}>
            <motion.div layout className={`licao-modal__header`}>
                <div className="licao-modal__header-config">
                    <div
                        className={`licao-modal__header--close`}
                        onClick={() => closeModal()}
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </div>

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
                                            closeModal();
                                            editLicao(licao);
                                        }}
                                    >
                                        <FontAwesomeIcon icon={faSquarePen} />
                                        <p>Editar Revista</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                <motion.div
                    variants={variantsContainer}
                    initial="hidden"
                    animate="visible"
                    layout
                    exit="exit"
                    className={`licao-modal__header-infos`}
                >
                    <AnimatePresence>
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
                                    whileTap={{ scale: 0.9 }}
                                    onTap={() => {}}
                                    transition={{ duration: 0.2 }}
                                >
                                    <span>
                                        <FontAwesomeIcon icon={faTimeline} />
                                    </span>
                                    <span>
                                        Postar vídeo de{" "}
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
                    </AnimatePresence>
                </motion.div>
            </motion.div>

            <div className="licao-modal__body">
                <ul className="licao-modal__registros">
                    {aulasDoTrimestre.map((aula, i) => (
                        <li
                            key={aula.numero}
                            onClick={() => {
                                navigate(`licao/${licao.id}/aula/${i + 1}`);
                            }}
                            className={
                                aula.aulaRegistrada ? "preenchida" : "pendente"
                            }
                        >
                            <div className="licao-modal__registros-infos">
                                <p>Lição {aula.numero}</p>
                                <data
                                    value={aula.data.toLocaleDateString(
                                        "pt-BR"
                                    )}
                                >
                                    {aula.data.toLocaleDateString("pt-BR")}
                                </data>
                            </div>

                            <div className="licao-modal__registros--status">
                                {aula.aulaRegistrada ? (
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
                                {aula?.aulaRegistrada ? (
                                    <button title="Ver/Editar">
                                        <FontAwesomeIcon icon={faPenToSquare} />
                                    </button>
                                ) : (
                                    <button title="Cadastrar">
                                        <FontAwesomeIcon icon={faPencil} />
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <div
                className="licao-modal--close"
                onClick={() => closeModal()}
            ></div>
        </motion.div>
    );
}

export default LicaoPreparoModal;
