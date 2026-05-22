import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUsers,
    faBookOpen,
    faCalendarWeek,
} from "@fortawesome/free-solid-svg-icons";
import "./licao-card.scss";
import React from "react";

interface LicaoCardProps {
    licaoId: string;
    isAtivo: boolean;
    img?: string | null;
    titulo: string;
    dataInicio: string;
    numeroAulas: number;
    trimestre: string;
    totalMatriculados?: number;
    onClick: (licaoId: string) => void;
}

function LicaoCard({
    dataInicio,
    isAtivo,
    licaoId,
    numeroAulas,
    onClick,
    titulo,
    img,
    totalMatriculados,
    trimestre,
}: LicaoCardProps) {
    return (
        <motion.div
            className="licao-card"
            whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0, 0, 0, 0.1)" }}
            whileTap={{ scale: 0.99 }}
            onTap={() => {
                window.history.pushState({ modal: true }, "");
                onClick(licaoId);
            }}
            layoutId={licaoId}
        >
            <motion.div
                className="licao-card__imagem"
                whileHover={{ opacity: 0.8 }}
            >
                <img
                    src={img || "/revista-placeholder.png"}
                    alt={`Capa da lição ${titulo}`}
                />
            </motion.div>

            <div className="licao-card__body">
                <div className="licao-card__status-infos">
                    <div
                        className={`licao-card__status ${
                            isAtivo ? "licao-card__status--ativa" : ""
                        }`}
                    >
                        {isAtivo ? "Ativa" : "Encerrada"}
                    </div>

                    <div
                        className={`licao-card__status licao-card__status-trimestre ${
                            isAtivo ? "licao-card__status--ativa" : ""
                        }`}
                    >
                        {trimestre}
                    </div>
                </div>

                <h3 className="licao-card__title">{titulo}</h3>

                <div className="licao-card__info">
                    <div className="licao-card__info-item">
                        <FontAwesomeIcon icon={faBookOpen} />
                        <span>{numeroAulas} Aulas</span>
                    </div>
                    <div className="licao-card__info-item">
                        <FontAwesomeIcon icon={faCalendarWeek} />
                        <span>{dataInicio}</span>
                    </div>
                    {totalMatriculados && (
                        <div className="licao-card__info-item">
                            <FontAwesomeIcon icon={faUsers} />
                            <span>{totalMatriculados} Alunos</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default React.memo(LicaoCard);
