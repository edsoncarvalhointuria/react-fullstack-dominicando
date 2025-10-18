import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import "./alert-modal.scss";
import { useEffect, type ReactNode } from "react";

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCancel: () => void;
    onConfirm: () => void;
    title: string;
    message: string | ReactNode;
    confirmText?: string;
    cancelText?: string;
    icon?: ReactNode;
}

function AlertModal({
    isOpen,
    onClose,
    onConfirm,
    onCancel,
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    icon,
}: AlertModalProps) {
    useEffect(() => {
        window.history.pushState({ modal: "open" }, "");
    }, []);
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="alert-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="alert-modal"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{
                            type: "spring",
                            damping: 25,
                            stiffness: 200,
                        }}
                    >
                        <div className="alert-modal__header">
                            <div className="alert-modal__header-icon">
                                {icon}
                            </div>
                            <h3>{title}</h3>
                            <button
                                className="alert-modal__close-btn"
                                onClick={onClose}
                            >
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        </div>

                        <div className="alert-modal__body">
                            <p>{message}</p>
                        </div>

                        <div className="alert-modal__actions">
                            <button
                                className="button-secondary"
                                onClick={onCancel}
                            >
                                {cancelText}
                            </button>
                            <button
                                className="button-primary"
                                onClick={onConfirm}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default AlertModal;
