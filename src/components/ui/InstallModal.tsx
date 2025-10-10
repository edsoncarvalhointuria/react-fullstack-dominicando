import { faCloudArrowDown, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import "./install-modal.scss";

function InstallModal({
    onClose,
    onConfirm,
}: {
    onClose: () => void;
    onConfirm: () => void;
}) {
    return (
        <motion.div
            className="install-modal-overlay"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                className="install-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="install-modal__header">
                    <div className="install-modal__img">
                        <img src="/logo-atualizada.svg" alt="Donicando" />
                    </div>

                    <button
                        onClick={onClose}
                        className="install-modal__close-btn"
                        title="Fechar"
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                <div className="install-modal__body">
                    <div className="install-modal__mensagem">
                        <span>
                            <FontAwesomeIcon icon={faCloudArrowDown} />
                        </span>
                        <h2>Instalar o Dominicando</h2>
                        <p>
                            Tenha acesso rápido e fácil à aplicação,
                            adicionando-a à sua tela inicial.
                        </p>
                    </div>

                    <div className="install-modal__actions">
                        <button className="button-primary" onClick={onConfirm}>
                            Instalar!
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default InstallModal;
