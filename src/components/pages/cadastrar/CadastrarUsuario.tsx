import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import "./cadastrar-usuario.scss";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowLeft,
    faCircleCheck,
    faCircleXmark,
    faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import { useAuthContext } from "../../../context/AuthContext";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FormProvider, useForm, type FieldError } from "react-hook-form";
import { getFunctions, httpsCallable } from "firebase/functions";
import Loading from "../../layout/loading/Loading";
import AlertModal from "../../ui/AlertModal";

interface FormCadastroUsuario {
    email: string;
    senha: string;
    nome: string;
    confirmacao: string;
}

const variantsContainer: Variants = {
    initial: {},
    animate: { transition: { delayChildren: stagger(0.2) } },
    exit: {},
};
const variantsItem: Variants = {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
};

const functions = getFunctions();
const cadastrarUsuarioComConvite = httpsCallable(
    functions,
    "cadastrarUsuarioComConvite"
);
const validarCodigoConvite = httpsCallable(functions, "validarCodigoConvite");

const ErroComponent = ({ erro }: { erro: FieldError | undefined }) => {
    return (
        <AnimatePresence>
            {erro && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    key={erro.message}
                    className="erro-message"
                >
                    <p>{erro.message}</p>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

function CadastrarUsuario() {
    const navigate = useNavigate();
    const { codigo } = useParams();
    const { user, login } = useAuthContext();
    const [key, setKey] = useState(0);
    const [keyConfirmacao, setKeyConfirmacao] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [mensagem, setMensagem] = useState<{
        message: string | ReactNode;
        onCancel: () => void;
        onClose: () => void;
        onConfirm: () => void;
        title: string;
        confirmText: string;
        icon?: any;
    } | null>(null);
    const [showPasswordConfirmacao, setShowPasswordConfirmacao] =
        useState(false);
    const [status, setStatus] = useState<
        "inicial" | "validando" | "sucesso" | "erro"
    >("inicial");
    const [retorno, setRetorno] = useState<{
        codigo: string;
        igreja: string;
    } | null>(null);

    const $codigo = useRef<HTMLInputElement>(null);
    const codigoRef = useRef<string | null>(null);
    const statusRef = useRef(status);

    const methods = useForm<FormCadastroUsuario>();
    const {
        handleSubmit,
        register,
        watch,
        formState: { errors },
    } = methods;

    const { senha } = watch();

    const onSubmit = async (dados: FormCadastroUsuario) => {
        const envio = {
            codigo: codigoRef.current,
            dados,
        };
        setIsLoading(true);

        try {
            const { data } = await cadastrarUsuarioComConvite(envio);
            console.log(data);
            await login(dados.email, dados.senha);
            navigate("/dashboard");
        } catch (error: any) {
            console.log("Deu esse erro", error);
            setMensagem({
                confirmText: "Ok",
                message: error.message,
                onCancel: () => setMensagem(null),
                onClose: () => setMensagem(null),
                onConfirm: () => setMensagem(null),
                title: "Erro ao cadastrar",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const validarCodigo = async () => {
        setStatus("validando");

        try {
            const codigo = $codigo.current?.value;
            if (!codigo) throw new Error("código invalido");
            const { data } = await validarCodigoConvite({ codigo });
            codigoRef.current = codigo;
            setRetorno(data as any);
            setStatus("sucesso");
        } catch (error) {
            console.log("deu esse erro", error);
            setStatus("erro");
        }
    };

    useEffect(() => {
        statusRef.current = status;
    }, [status]);
    useEffect(() => {
        if (user) navigate("dashboard");
    }, [user]);
    useEffect(() => {
        const keyup = () => {
            if (statusRef.current === "erro") setStatus("inicial");
        };
        $codigo.current?.addEventListener("keyup", keyup);

        return () => $codigo.current?.removeEventListener("keyup", keyup);
    }, []);

    if (isLoading) return <Loading />;
    return (
        <>
            <motion.div
                className="pagina-cadastrar-usuario"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="pagina-cadastrar-usuario__container"
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring" }}
                >
                    {status !== "sucesso" && (
                        <motion.div
                            key={"header-pagina-cadastrar-usuario"}
                            exit={{ opacity: 0 }}
                            className="pagina-cadastrar-usuario__header"
                        >
                            <h2>Insira o código abaixo</h2>
                        </motion.div>
                    )}

                    <div className="pagina-cadastrar-usuario__body">
                        <div
                            className={`pagina-cadastrar-usuario__codigo pagina-cadastrar-usuario__codigo--${status}`}
                        >
                            <input
                                type="text"
                                readOnly={
                                    status === "validando" ||
                                    status === "sucesso"
                                }
                                ref={$codigo}
                                value={codigo}
                                onChange={() => {}}
                            />
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onTap={validarCodigo}
                                disabled={
                                    status === "validando" ||
                                    status === "sucesso"
                                }
                                className="pagina-cadastrar-usuario__codigo-btn"
                            >
                                {status === "inicial" ? (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        validar
                                    </motion.span>
                                ) : status === "validando" ? (
                                    <span className="pagina-cadastrar-usuario__codigo-spinner"></span>
                                ) : status === "sucesso" ? (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <FontAwesomeIcon icon={faCircleCheck} />
                                    </motion.span>
                                ) : (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <FontAwesomeIcon icon={faCircleXmark} />
                                    </motion.span>
                                )}
                            </motion.button>
                        </div>

                        {status === "sucesso" && (
                            <motion.div
                                key={"form-cadastrar-usuario"}
                                variants={variantsContainer}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="pagina-cadastrar-usuario__form"
                            >
                                {/* <h3>Preencha seus dados abaixo</h3> */}
                                <FormProvider {...methods}>
                                    <form onSubmit={handleSubmit(onSubmit)}>
                                        <div className="pagina-cadastrar-usuario__form-inputs">
                                            <motion.div
                                                variants={variantsItem}
                                                className="pagina-cadastrar-usuario__igreja"
                                            >
                                                <h4>{retorno?.igreja}</h4>
                                            </motion.div>

                                            <motion.div
                                                variants={variantsItem}
                                                className="pagina-cadastrar-usuario__input"
                                            >
                                                <label htmlFor="cadastrar-usuario-nome">
                                                    Nome Completo
                                                </label>
                                                <input
                                                    type="text"
                                                    id="cadastrar-usuario-nome"
                                                    className={
                                                        errors.nome &&
                                                        "input-error"
                                                    }
                                                    {...register("nome", {
                                                        required:
                                                            "O nome é obrigatório",
                                                        min: {
                                                            value: 3,
                                                            message:
                                                                "O nome precisa ter ao menos 3 caracteres",
                                                        },
                                                    })}
                                                />

                                                <ErroComponent
                                                    erro={errors.nome}
                                                />
                                            </motion.div>

                                            <motion.div
                                                variants={variantsItem}
                                                className="pagina-cadastrar-usuario__input"
                                            >
                                                <label htmlFor="cadastrar-usuario-email">
                                                    E-mail
                                                </label>
                                                <input
                                                    type="email"
                                                    id="cadastrar-usuario-email"
                                                    className={
                                                        errors.email &&
                                                        "input-error"
                                                    }
                                                    {...register("email", {
                                                        required:
                                                            "O e-mail é obrigatório",
                                                    })}
                                                />
                                                <ErroComponent
                                                    erro={errors.email}
                                                />
                                            </motion.div>

                                            <motion.div
                                                variants={variantsItem}
                                                className="pagina-cadastrar-usuario__input-group"
                                            >
                                                <div className="pagina-cadastrar-usuario__input">
                                                    <label htmlFor="cadastrar-usuario-senha">
                                                        Senha
                                                    </label>
                                                    <div className="pagina-cadastrar-usuario__input--senha">
                                                        <input
                                                            type={
                                                                showPassword
                                                                    ? "text"
                                                                    : "password"
                                                            }
                                                            className={
                                                                errors.senha &&
                                                                "input-error"
                                                            }
                                                            id="cadastrar-usuario-senha"
                                                            {...register(
                                                                "senha",
                                                                {
                                                                    required:
                                                                        "A senha é obrigatória",
                                                                    minLength: {
                                                                        value: 6,
                                                                        message:
                                                                            "A senha precisa ter no mínimo 6 caracteres",
                                                                    },
                                                                }
                                                            )}
                                                        />
                                                        <button
                                                            type="button"
                                                            title="Ver senha"
                                                        >
                                                            <motion.div
                                                                className="pagina-cadastrar-usuario__input--image"
                                                                onMouseOver={() =>
                                                                    setKey(
                                                                        (v) =>
                                                                            v +
                                                                            1
                                                                    )
                                                                }
                                                                onTap={() =>
                                                                    setShowPassword(
                                                                        (v) =>
                                                                            !v
                                                                    )
                                                                }
                                                            >
                                                                <img
                                                                    src={`/eye${
                                                                        showPassword
                                                                            ? "-close"
                                                                            : ""
                                                                    }.gif?key=${key}`}
                                                                    alt="Ver senha"
                                                                />
                                                            </motion.div>
                                                        </button>
                                                    </div>
                                                    <ErroComponent
                                                        erro={errors.senha}
                                                    />
                                                </div>
                                                <div className="pagina-cadastrar-usuario__input">
                                                    <label htmlFor="cadastrar-usuario-senha-confirmacao">
                                                        Confirme a Senha
                                                    </label>
                                                    <div className="pagina-cadastrar-usuario__input--senha">
                                                        <input
                                                            type={
                                                                showPasswordConfirmacao
                                                                    ? "text"
                                                                    : "password"
                                                            }
                                                            id="cadastrar-usuario-senha-confirmacao"
                                                            className={
                                                                errors.confirmacao &&
                                                                "input-error"
                                                            }
                                                            {...register(
                                                                "confirmacao",
                                                                {
                                                                    required:
                                                                        "As senhas estão diferentes",
                                                                    validate: (
                                                                        v
                                                                    ) =>
                                                                        v ===
                                                                        senha
                                                                            ? true
                                                                            : "As senhas estão diferentes",
                                                                }
                                                            )}
                                                        />
                                                        <button
                                                            type="button"
                                                            title="Ver senha"
                                                        >
                                                            <motion.div
                                                                className="pagina-cadastrar-usuario__input--image"
                                                                onMouseOver={() =>
                                                                    setKeyConfirmacao(
                                                                        (v) =>
                                                                            v +
                                                                            1
                                                                    )
                                                                }
                                                                onTap={() =>
                                                                    setShowPasswordConfirmacao(
                                                                        (v) =>
                                                                            !v
                                                                    )
                                                                }
                                                            >
                                                                <img
                                                                    src={`/eye${
                                                                        showPasswordConfirmacao
                                                                            ? "-close"
                                                                            : ""
                                                                    }.gif?key=${keyConfirmacao}`}
                                                                    alt="Ver senha"
                                                                />
                                                            </motion.div>
                                                        </button>
                                                    </div>
                                                    <ErroComponent
                                                        erro={
                                                            errors.confirmacao
                                                        }
                                                    />
                                                </div>
                                            </motion.div>
                                        </div>

                                        <motion.div
                                            variants={variantsItem}
                                            className="pagina-cadastrar-usuario__form-btn"
                                        >
                                            <button
                                                type="submit"
                                                title="Cadastrar usuário"
                                            >
                                                <FontAwesomeIcon
                                                    icon={faPaperPlane}
                                                />
                                                Cadastrar
                                            </button>
                                        </motion.div>
                                    </form>
                                </FormProvider>
                            </motion.div>
                        )}
                    </div>

                    <div className="pagina-cadastrar-usuario__footer">
                        <Link to="/cadastrar">
                            <FontAwesomeIcon icon={faArrowLeft} />
                            Voltar para o Cadastro
                        </Link>
                    </div>
                </motion.div>
            </motion.div>

            <AlertModal
                isOpen={!!mensagem}
                message={mensagem?.message}
                onCancel={() => mensagem?.onCancel()}
                onClose={() => mensagem?.onClose()}
                onConfirm={() => mensagem?.onConfirm()}
                title={mensagem?.title || ""}
                confirmText={mensagem?.confirmText}
                icon={mensagem?.icon}
            />
        </>
    );
}

export default CadastrarUsuario;
