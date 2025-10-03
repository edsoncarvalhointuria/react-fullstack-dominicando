import { motion, AnimatePresence, type Variants } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCircleCheck,
    faCircleXmark,
    faEnvelope,
    faLock,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import "./reset-senha-modal.scss";
import { FormProvider, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import LoadingModal from "../layout/loading/LoadingModal";
import { useAuthContext } from "../../context/AuthContext";

interface ResetSenhaModalProps {
    onClose: () => void;
    onConfirm: () => void;
}

const variantsItem: Variants = {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
};

function ResetSenhaModal({ onClose, onConfirm }: ResetSenhaModalProps) {
    const [isEnviando, setIsEnviando] = useState(false);
    const [status, setStatus] = useState<"inicial" | "sucesso" | "erro">(
        "inicial"
    );
    const methods = useForm<{ email: string }>();
    const { resetPassword } = useAuthContext();
    const onSubmit = async (dados: { email: string }) => {
        setIsEnviando(true);
        try {
            await resetPassword(dados.email);
            setStatus("sucesso");
        } catch {
            setStatus("erro");
        } finally {
            setIsEnviando(false);
        }
    };

    useEffect(() => {
        let timeout = 0;
        if (status === "erro" || status === "sucesso")
            timeout = setTimeout(onClose, 3000) as any;

        return () => clearTimeout(timeout);
    }, [status]);
    return (
        <motion.div
            key={"reset-modal-container"}
            className="reset-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onClose}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="reset-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{
                    type: "spring",
                    damping: 25,
                    stiffness: 200,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <LoadingModal
                    isEnviando={isEnviando}
                    mensagem="Validando Email"
                />
                <div className="reset-modal__header">
                    <h3>
                        <span className="reset-modal__header-icon">
                            <FontAwesomeIcon icon={faLock} />
                        </span>{" "}
                        Esqueceu a senha?
                    </h3>
                    <button
                        className="reset-modal__close-btn"
                        onClick={onClose}
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                <AnimatePresence>
                    {status === "inicial" ? (
                        <FormProvider key={"form-reset-password"} {...methods}>
                            <form onSubmit={methods.handleSubmit(onSubmit)}>
                                <div className="reset-modal__body">
                                    <label htmlFor="reset-senha-email">
                                        <span>
                                            <FontAwesomeIcon
                                                icon={faEnvelope}
                                            />
                                        </span>
                                        E-mail:
                                    </label>
                                    <input
                                        type="email"
                                        id="reset-senha-email"
                                        {...methods.register("email", {
                                            required:
                                                "Por favor, insira o email.",
                                        })}
                                    />
                                </div>

                                <div className="reset-modal__actions">
                                    <button
                                        className="button-secondary"
                                        onClick={onClose}
                                        type="button"
                                        title="Cancelar"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        className="button-primary"
                                        onClick={onConfirm}
                                        type="submit"
                                        title="Enviar link de redefinição"
                                    >
                                        Enviar link de redefinição
                                    </button>
                                </div>
                            </form>
                        </FormProvider>
                    ) : status === "sucesso" ? (
                        <motion.div
                            key="reset-modal-sucesso"
                            className="reset-modal__sucesso"
                            variants={variantsItem}
                            initial="initial"
                            exit={"exit"}
                            animate="animate"
                        >
                            <h3>
                                <span>
                                    <FontAwesomeIcon icon={faCircleCheck} />
                                </span>
                                O email enviado com sucesso!
                                <br /> Não esqueça de olhar a caixa de spam.
                            </h3>
                        </motion.div>
                    ) : (
                        <motion.div
                            key={"reset-modal-erro"}
                            className="reset-modal__erro"
                            variants={variantsItem}
                            initial="initial"
                            exit={"exit"}
                            animate="animate"
                        >
                            <h3>
                                <span>
                                    <FontAwesomeIcon icon={faCircleXmark} />
                                </span>
                                E-mail invalido.
                            </h3>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}

export default ResetSenhaModal;
