import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./login.scss";
import { useAuthContext } from "../../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../../layout/footer/Footer";
import ModalSkeleton from "../../ui/ModalSkeleton";

const ResetSenhaModal = lazy(() => import("../../ui/ResetSenhaModal"));

function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [eyeKey, setEyeKey] = useState(0);
    const [isDisable, setIsDisable] = useState(true);
    const [resetSenha, setResetSenha] = useState(false);
    const [erro, setErro] = useState(false);
    const navigate = useNavigate();

    const $login = useRef<HTMLInputElement>(null);
    const $password = useRef<HTMLInputElement>(null);

    const { login, user, isLoadingAuth } = useAuthContext();

    const enable = () => {
        if ($login.current && $password.current)
            if ($login.current.value.trim().length >= 3 && $password.current.value.trim().length >= 3)
                setIsDisable(false);
            else setIsDisable(true);
    };

    useEffect(() => {
        const { igrejaHash, alunoHash } = JSON.parse(localStorage.getItem("login-portal-aluno") ?? "{}");
        if (igrejaHash && alunoHash && !user && isLoadingAuth === false) {
            navigate(`/portal-aluno/${igrejaHash}/${alunoHash}`);
        }
    }, [user, isLoadingAuth]);
    return (
        <>
            <motion.section
                className="login-page"
                layout
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 1 }}
            >
                <motion.div className="login-page__container" layout>
                    <div className="login-page__logo">
                        <img src="./logo-preenchida.svg" alt="Logo Dominicando" />
                        <span>ominicando</span>
                    </div>
                    <h1 className="login-page__title">Acessar o painel</h1>
                    <div className="login-page__form">
                        <AnimatePresence>
                            {erro && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0, transition: { delay: 2 } }}
                                    transition={{ ease: "linear", duration: 0.5 }}
                                    onAnimationComplete={() => setErro(false)}
                                >
                                    <motion.div className="login-page__erro" key={"erro-mensagem"}>
                                        <p>Login ou senha invalidos</p>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="login-page__form-input">
                            <label htmlFor="login-input">Login:</label>
                            <input
                                placeholder="Digite seu email"
                                ref={$login}
                                type="email"
                                name="login-input"
                                id="login-input"
                                onKeyUp={enable}
                            />
                        </div>
                        <div className="login-page__form-input">
                            <label htmlFor="login-input">Senha:</label>
                            <div className="login-page__form-input--password">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password-input"
                                    id="password-input"
                                    ref={$password}
                                    onKeyUp={enable}
                                    placeholder="Digite sua senha"
                                />
                                <img
                                    src={`./eye${showPassword ? "-close" : ""}.gif?key=${eyeKey}`}
                                    onClick={() => {
                                        setShowPassword((v) => !v);
                                        setEyeKey((v) => v + 1);
                                    }}
                                    onMouseOver={() => setEyeKey((v) => v + 1)}
                                    alt="Ver"
                                />
                            </div>
                        </div>

                        <div className="login-page__form-links">
                            <Link to={"/cadastrar"}>Não tem conta? Cadastre-se aqui!</Link>
                            <p onClick={() => setResetSenha(true)}>Esqueceu a senha? Clique aqui!</p>
                        </div>

                        <div className="login-page__form-buttons">
                            <button
                                disabled={isDisable || isLoadingAuth}
                                onClick={() => {
                                    login($login.current?.value || "", $password.current?.value || "").catch(() =>
                                        setErro(true),
                                    );
                                }}
                            >
                                {isLoadingAuth ? "Carregando usuário" : "Login"}
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
            <Footer />

            <AnimatePresence>
                {resetSenha && (
                    <Suspense fallback={<ModalSkeleton />}>
                        <ResetSenhaModal
                            key={"reset-senha-modal-login"}
                            onClose={() => setResetSenha(false)}
                            onConfirm={() => undefined}
                        />
                    </Suspense>
                )}
            </AnimatePresence>
        </>
    );
}

export default Login;
