import { AnimatePresence, motion } from "framer-motion";
import "./loading-modal.scss";
import { useEffect, useRef, useState } from "react";

interface Props {
    isEnviando: boolean;
    mensagem?: string;
}

function LoadingModal({ isEnviando, mensagem = "Enviando" }: Props) {
    const [mensagemCarregando, setMensagemCarregando] = useState(mensagem);
    const timeout = useRef<any>(0);
    useEffect(() => {
        timeout.current = setTimeout(() => {
            setMensagemCarregando((v) =>
                v.includes("...") ? mensagem : v + "."
            );
        }, 2000);

        return () => clearTimeout(timeout.current);
    }, [mensagemCarregando]);
    return (
        <AnimatePresence>
            {isEnviando && (
                <motion.div
                    className="loading-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="loading-overlay__spinner"></div>
                    <p>{mensagemCarregando}</p>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default LoadingModal;
