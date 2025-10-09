//@ts-ignore
import { useRegisterSW } from "virtual:pwa-register/react";
import "./pwa.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence } from "framer-motion";

function PWReloadPrompt() {
    const {
        offlineReady: [offlineReady],
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered() {
            console.log("Service Worker registrado com sucesso");
        },
        onRegisterError(error: any) {
            console.log("ERRO no registro do Service Worker:", error);
        },
    });

    return (
        <AnimatePresence>
            {(offlineReady || needRefresh) && (
                <motion.div
                    className="pwa-toast"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                >
                    {needRefresh && (
                        <button
                            className="pwa-toast__button"
                            onClick={() => updateServiceWorker(true)}
                        >
                            <FontAwesomeIcon icon={faRotateRight} />
                            Atualizar
                        </button>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default PWReloadPrompt;
