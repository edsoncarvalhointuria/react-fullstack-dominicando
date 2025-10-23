import { motion } from "framer-motion";
import type { LicaoPreparoInterface } from "../../interfaces/LicaoPreparoInterface";
import "./licao-preparo-card.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBookOpen, faCalendarWeek } from "@fortawesome/free-solid-svg-icons";

function LicaoPreparoCard({
    licao,
    openModal,
}: {
    licao: LicaoPreparoInterface;
    openModal: (licao: LicaoPreparoInterface) => void;
}) {
    return (
        <motion.div
            className="licao-card"
            whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0, 0, 0, 0.1)" }}
            whileTap={{ scale: 0.9 }}
            onTap={() => {
                openModal(licao);
                window.history.pushState({ modal: true }, "");
            }}
            layoutId={licao.id}
        >
            <motion.div
                className="licao-card__imagem"
                whileHover={{ opacity: 0.8 }}
            >
                <img
                    src={licao.img || "/revista-placeholder.png"}
                    alt={`Capa da lição ${licao.titulo}`}
                />
            </motion.div>

            <div className="licao-card__body">
                <div className="licao-card__status-infos">
                    <div
                        className={`licao-card__status ${
                            licao.ativo ? "licao-card__status--ativa" : ""
                        }`}
                    >
                        {licao.ativo ? "Ativa" : "Encerrada"}
                    </div>

                    <div
                        className={`licao-card__status licao-card__status-trimestre ${
                            licao.ativo ? "licao-card__status--ativa" : ""
                        }`}
                    >
                        {licao?.trimestre || 1} º Trimestre de{" "}
                        {licao.data_inicio
                            .toDate()
                            .toLocaleDateString("pt-BR", { year: "numeric" })}
                    </div>
                </div>

                <h3 className="licao-card__title">{licao.titulo}</h3>

                <div className="licao-card__info">
                    <div className="licao-card__info-item">
                        <FontAwesomeIcon icon={faBookOpen} />
                        <span>{licao.numero_aulas} Aulas</span>
                    </div>
                    <div className="licao-card__info-item">
                        <FontAwesomeIcon icon={faCalendarWeek} />
                        <span>
                            {licao.data_inicio
                                .toDate()
                                .toLocaleDateString("pt-BR", {
                                    month: "2-digit",
                                    year: "numeric",
                                })}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default LicaoPreparoCard;
