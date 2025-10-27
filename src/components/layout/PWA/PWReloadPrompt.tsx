//@ts-ignore
import { useRegisterSW } from "virtual:pwa-register/react";
import "./pwa.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { limparCache } from "../../../utils/limparCache";

function PWReloadPrompt() {
    const {
        // offlineReady: [offlineReady],
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: any) {
            if (r && r.update) {
                // Verifica se há uma atualização nova a cada 30 segundos
                setInterval(() => {
                    r.update();
                }, 30000);
            }
            console.log("Service Worker registrado com sucesso");
        },
        onRegisterError(error: any) {
            console.log("ERRO no registro do Service Worker:", error);
        },
    });

    const [show, setShow] = useState(false);

    useEffect(() => {
        const hasClearedCache = localStorage.getItem("chace-v1");
        if (!hasClearedCache) setShow(true);
    }, []);

    const showButton = needRefresh || show;

    return (
        <AnimatePresence>
            {showButton && (
                <motion.div
                    className="pwa-toast"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                >
                    <button
                        className="pwa-toast__button"
                        onClick={() =>
                            show ? limparCache() : updateServiceWorker(true)
                        }
                    >
                        <FontAwesomeIcon icon={faRotateRight} />
                        Atualizar nova versão
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default PWReloadPrompt;
