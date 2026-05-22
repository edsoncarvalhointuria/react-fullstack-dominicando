import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState, type ReactNode } from "react";
import LoadingModal from "../layout/loading/LoadingModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faChevronDown,
    faSquarePen,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import "./novo-trimestre-modal.scss";
import { useWatch, type Control } from "react-hook-form";

export const ListaDeAulas = React.memo(
    ({
        control,
        nameAulas,
        nameData,
    }: {
        control: Control<any>;
        nameData: string;
        nameAulas: string;
    }) => {
        const [showAulas, setShowAulas] = useState(false);
        const [dataAulas, setDataAulas] = useState<string[][]>([]);
        const dataInicio = useWatch({ control, name: nameData });
        const numeroAulas = useWatch({ control, name: nameAulas });

        useEffect(() => {
            if (dataInicio && numeroAulas > 0) {
                const data = new Date(dataInicio + "T12:00:00");

                if (data.getUTCDay() !== 0) return setDataAulas([]);

                const listaDatas: string[][] = Array.from({
                    length: numeroAulas,
                }).map((_, i) => {
                    const dataAula = new Date(data);
                    dataAula.setUTCDate(dataAula.getUTCDate() + i * 7);
                    return [
                        "Aula " + (i + 1),
                        dataAula.toLocaleDateString("pt-BR"),
                    ];
                });

                setDataAulas(listaDatas);
            }
        }, [dataInicio, numeroAulas]);
        return (
            <AnimatePresence>
                {dataAulas.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        onTap={() => setShowAulas((v) => !v)}
                        key={"previsao-aulas"}
                        style={{ flexShrink: 0 }}
                    >
                        <div
                            className={`novo-trimestre__previsao-aulas ${showAulas ? "is-open" : ""}`}
                        >
                            <h3>
                                Lista de aulas{" "}
                                <span>
                                    <FontAwesomeIcon icon={faChevronDown} />
                                </span>
                            </h3>
                            <AnimatePresence>
                                {showAulas && (
                                    <motion.div
                                        key={"previsao-aulas-container"}
                                        initial={{ y: -10, height: 0 }}
                                        animate={{ y: 0, height: "auto" }}
                                        exit={{ y: -10, height: 0 }}
                                    >
                                        <ul className="novo-trimestre__previsao-aulas--lista">
                                            {dataAulas.map(([aula, data]) => (
                                                <li key={aula + data}>
                                                    <p>{aula}</p>
                                                    <data value={data}>
                                                        {data}
                                                    </data>
                                                </li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    },
);

function NovoTrimestreTemplate({
    children,
    isEnviando,
    isLoading,
    isEdit,
    title,
}: {
    children: ReactNode;
    isEnviando: boolean;
    isLoading: boolean;
    isEdit: boolean;
    title: string;
}) {
    return (
        <motion.div
            className="novo-trimestre-close"
            onClick={() => (!isEnviando ? window.history.back() : null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="novo-trimestre"
                style={{ minHeight: "auto" }}
                initial={{ y: 0 }}
                exit={{ y: 50 }}
                onClick={(e) => e.stopPropagation()}
            >
                <>
                    <LoadingModal isEnviando={isLoading || isEnviando} />
                    <div className="novo-trimestre__header">
                        <div className="novo-trimestre__header--title-group">
                            <div className="novo-trimestre__header--title">
                                <h2>{title}</h2>
                            </div>
                        </div>

                        <div
                            className="novo-trimestre__header--close"
                            onClick={() => window.history.back()}
                        >
                            <FontAwesomeIcon icon={faXmark} />
                        </div>

                        {isEdit ? (
                            <div className="novo-trimestre__header--aviso">
                                <FontAwesomeIcon icon={faSquarePen} />
                                <span>Atenção: você está editando</span>
                            </div>
                        ) : (
                            <></>
                        )}
                    </div>
                    <div className="novo-trimestre__body">{children}</div>
                </>
            </motion.div>
        </motion.div>
    );
}

export default NovoTrimestreTemplate;
