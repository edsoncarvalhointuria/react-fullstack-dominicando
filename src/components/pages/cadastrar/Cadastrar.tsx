import { Link, useNavigate } from "react-router-dom";
import "./cadastrar.scss";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowLeft,
    faChurch,
    faUserPlus,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect } from "react";
import { useAuthContext } from "../../../context/AuthContext";

function Cadastrar() {
    const { user } = useAuthContext();
    const navigate = useNavigate();
    useEffect(() => {
        if (user) navigate("/dashboard");
    }, [user]);
    return (
        <motion.section
            className="pagina-cadastro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="pagina-cadastro__card"
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring" }}
            >
                <div className="pagina-cadastro__header">
                    <span className="pagina-cadastro__icone">
                        <FontAwesomeIcon icon={faUserPlus} />
                    </span>
                    <h2>Junte-se ao Dominicando</h2>
                    <p>
                        Escolha uma das opções abaixo para começar a organizar
                        sua escola dominical.
                    </p>
                </div>

                <div className="pagina-cadastro__actions">
                    <motion.button
                        className="button-primary"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate("/cadastrar/usuario")}
                    >
                        <FontAwesomeIcon icon={faUserPlus} />
                        Cadastrar com um Convite
                    </motion.button>
                    <motion.button
                        className="button-secondary"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate("/cadastrar/ministerio")}
                    >
                        <FontAwesomeIcon icon={faChurch} />
                        Cadastrar Novo Ministério
                    </motion.button>
                </div>

                <div className="pagina-cadastro__footer">
                    <Link to="/">
                        <FontAwesomeIcon icon={faArrowLeft} />
                        Voltar para o Login
                    </Link>
                </div>
            </motion.div>
        </motion.section>
    );
}

export default Cadastrar;
