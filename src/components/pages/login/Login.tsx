import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./login.scss";
import { useAuthContext } from "../../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ResetSenhaModal from "../../ui/ResetSenhaModal";

function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [eyeKey, setEyeKey] = useState(0);
    const [isDisable, setIsDisable] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [resetSenha, setResetSenha] = useState(false);

    const [erro, setErro] = useState(false);
    const navigate = useNavigate();

    const $login = useRef<HTMLInputElement>(null);
    const $password = useRef<HTMLInputElement>(null);

    const { login, user } = useAuthContext();

    const enable = () => {
        if ($login.current && $password.current)
            if (
                $login.current.value.trim().length >= 3 &&
                $password.current.value.trim().length >= 3
            )
                setIsDisable(false);
            else setIsDisable(true);
    };

    useEffect(() => {
        setTimeout(() => setErro(false), 3000);
    }, [erro]);
    useEffect(() => {
        if (user) navigate("/dashboard");
    }, []);

    return (
        <>
            <motion.section
                className="login-page"
                layout
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
            >
                <motion.div className="login-page__container" layout>
                    <div className="login-page__logo">
                        <img
                            src="./logo-cor-oficial-completa.svg"
                            alt="Logo Dominicando"
                        />
                    </div>
                    <h1 className="login-page__title">Acessar o painel</h1>
                    <div className="login-page__form">
                        <AnimatePresence>
                            {erro && (
                                <motion.div
                                    className="login-page__erro"
                                    key={"erro-mensagem"}
                                    initial={{ opacity: 0, scale: 0.3 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.3 }}
                                >
                                    <p>Login ou senha invalidos</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="login-page__form-input">
                            <label htmlFor="login-input">Login:</label>
                            <input
                                ref={$login}
                                type="text"
                                name="login-input"
                                id="login-input"
                                onKeyUp={enable}
                            />
                        </div>
                        <div className="login-page__form-input">
                            <label htmlFor="login-input">Senha:</label>
                            <div className="login-page__form-input--password">
                                <motion.input
                                    layout
                                    type={showPassword ? "text" : "password"}
                                    name="password-input"
                                    id="password-input"
                                    ref={$password}
                                    onKeyUp={enable}
                                />
                                <motion.img
                                    layout
                                    src={`./eye${
                                        showPassword ? "-close" : ""
                                    }.gif?key=${eyeKey}`}
                                    whileHover={{ scale: 0.9 }}
                                    onTap={() => {
                                        setShowPassword((v) => !v);
                                        setEyeKey((v) => v + 1);
                                    }}
                                    onMouseOver={() => setEyeKey((v) => v + 1)}
                                    alt="Ver"
                                />
                            </div>
                        </div>

                        <div className="login-page__form-links">
                            <Link to={"/cadastrar"}>
                                Não tem conta? Cadastre-se aqui!
                            </Link>
                            <p onClick={() => setResetSenha(true)}>
                                Esqueceu a senha? Clique aqui!
                            </p>
                        </div>

                        <div className="login-page__form-buttons">
                            <button
                                disabled={isDisable || isLoading}
                                onClick={() => {
                                    setIsLoading(true);
                                    login(
                                        $login.current?.value || "",
                                        $password.current?.value || ""
                                    )
                                        .catch(() => setErro(true))
                                        .finally(() => setIsLoading(false));
                                }}
                            >
                                Login
                            </button>
                            {/* <p>ou</p>
                        <div className="login-page__form-buttons--google">
                            <button
                                disabled={isLoading}
                                onClick={() => {
                                    setIsLoading(true);
                                    loginComGoogle()
                                        .catch(() => setErro(true))
                                        .finally(() => setIsLoading(false));
                                }}
                            >
                                <img
                                    src="./google_logo.png"
                                    alt="Logo google"
                                />
                                Login com Google
                            </button>
                        </div> */}
                        </div>
                    </div>
                </motion.div>
            </motion.section>

            <AnimatePresence>
                {resetSenha && (
                    <ResetSenhaModal
                        key={"reset-senha-modal-login"}
                        onClose={() => setResetSenha(false)}
                        onConfirm={() => undefined}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

export default Login;
