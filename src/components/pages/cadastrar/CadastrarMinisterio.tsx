import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import "./cadastrar-ministerio.scss";
import { useAuthContext } from "../../../context/AuthContext";
import { useEffect } from "react";

function CadastrarMinisterio() {
    const navigate = useNavigate();
    const { user } = useAuthContext();

    useEffect(() => {
        if (user) navigate("/dashboard");
    }, [user]);
    return (
        <motion.div
            className="cadastro-ministerio"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="cadastro-ministerio__card">
                <h2>Em Breve!</h2>
                <p>
                    A funcionalidade de cadastro de novos ministérios está em
                    desenvolvimento.
                </p>
                <p>
                    Se você deseja cadastrar o seu, por favor, entre em contato
                    diretamente pelo e-mail: <br />
                    <strong>edsoncarvalhointuria@gmail.com</strong>
                </p>
                <Link to="/cadastrar">
                    <FontAwesomeIcon icon={faArrowLeft} />
                    Voltar
                </Link>
            </div>
        </motion.div>
    );
}

export default CadastrarMinisterio;
