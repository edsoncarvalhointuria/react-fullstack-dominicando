import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./notificacao-modal.scss";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

function NotificacaoModal({ close }: { close: () => void }) {
    const [fechando, setFechando] = useState(15);

    const keyTimeout = useRef(0);
    useEffect(() => {
        if (fechando)
            keyTimeout.current = setTimeout(
                () => setFechando((v) => v - 1),
                1000
            ) as any;
        else close();

        return () => clearTimeout(keyTimeout.current);
    }, [fechando]);

    return (
        <motion.div className="notificao-modal-overlay" exit={{ opacity: 0 }}>
            <div className="notificao-modal">
                <div className="notificao-modal__header">
                    <div className="notificao-modal__title">
                        <span>
                            <FontAwesomeIcon icon={faBell} />
                        </span>
                        <h2>Deseja receber notificações?</h2>
                    </div>

                    <div className="notificao-modal__fechando">
                        <p>
                            Fechando em <span>{fechando}</span>
                        </p>
                    </div>
                </div>

                <div className="notificao-modal__body">
                    <div className="notificao-modal__mensagem">
                        <p>Deseja receber notificações do Dominicando?</p>
                        <div className="notificao-modal__toggle">
                            <label htmlFor="notificao-modal-ativar"></label>
                            <input
                                type="checkbox"
                                id="notificao-modal-ativar"
                                onChange={(v) => {
                                    if (v.target.checked)
                                        Notification.requestPermission().then(
                                            close
                                        );
                                }}
                            />
                        </div>
                    </div>

                    <hr />

                    <div className="notificao-modal__conta">
                        <p>
                            Você pode ativar ou desativar as notificações na
                            página{" "}
                            <Link to={"/minha-conta"} onClick={close}>
                                Minha Conta
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default NotificacaoModal;
