import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuthContext } from "../../../context/AuthContext";
import { ROLES } from "../../../roles/Roles";
import "./notificacoes.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMessage, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import {
    Controller,
    FormProvider,
    useForm,
    type FieldError,
} from "react-hook-form";
import Dropdown from "../../ui/Dropdown";
import { AnimatePresence, motion } from "framer-motion";
import { getFunctions, httpsCallable } from "firebase/functions";
import AlertModal from "../../ui/AlertModal";
import Loading from "../../layout/loading/Loading";
import { useNavigate } from "react-router-dom";

interface NotificacaoForm {
    destinarios: string;
    titulo: string;
    mensagem: string;
}

const ErroComponent = ({ error }: { error: FieldError | undefined }) => {
    return (
        <AnimatePresence>
            {error?.message && (
                <motion.div
                    className="notificacoes-page__error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                >
                    {error.message}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const functions = getFunctions();
const enviarNotificacao = httpsCallable(functions, "enviarNotificacao");

function Notificacoes() {
    const DESTINATARIOS = [
        { id: "todos", nome: "Todos" },
        { id: ROLES.PASTOR_PRESIDENTE, nome: "Pastores Presidentes" },
        { id: ROLES.SUPER_ADMIN, nome: "Administradores Ministério" },
        { id: ROLES.PASTOR, nome: "Pastores" },
        { id: ROLES.SECRETARIO_CONGREGACAO, nome: "Secretários Congregação" },
        { id: ROLES.SECRETARIO_CLASSE, nome: "Secretários Classe" },
    ];
    const { user, isSuperAdmin, isSecretario } = useAuthContext();

    const [alert, setAlert] = useState<{
        message: string | ReactNode;
        title: string;
        confirmText: string;
        cancelText: string;
        onCancel: () => void;
        onClose: () => void;
        onConfirm: () => void;
        icon?: any;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const methods = useForm<NotificacaoForm>({
        defaultValues: {
            destinarios: "todos",
            mensagem: "",
            titulo: "",
        },
    });
    const {
        watch,
        handleSubmit,
        control,
        register,
        formState: { errors },
    } = methods;
    const { mensagem, titulo } = watch();

    const onSubmit = (data: NotificacaoForm) => {
        setIsLoading(true);
        enviarNotificacao({ ...data })
            .then(({ data }) => {
                setAlert({
                    title: "Sucesso!",
                    message: (data as any).message,
                    cancelText: "Cancelar",
                    confirmText: "Ok",
                    onCancel: () => setAlert(null),
                    onClose: () => setAlert(null),
                    onConfirm: () => setAlert(null),
                });
            })
            .catch((error: any) => {
                setAlert({
                    title: "Erro ao enviar",
                    message: error.message,
                    cancelText: "Cancelar",
                    confirmText: "Ok",
                    onCancel: () => setAlert(null),
                    onClose: () => setAlert(null),
                    onConfirm: () => setAlert(null),
                });
            })
            .finally(() => setIsLoading(false));
    };

    const destinatariosMemo = useMemo(() => {
        if (!user) return [];
        let d = DESTINATARIOS;

        if (user.role === ROLES.SUPER_ADMIN)
            d = d.filter((v) => v.id !== ROLES.PASTOR_PRESIDENTE);
        if (!isSuperAdmin.current)
            d = d.filter(
                (v) =>
                    v.id !== ROLES.PASTOR_PRESIDENTE &&
                    v.id !== ROLES.SUPER_ADMIN
            );
        if (isSecretario.current)
            d = d.filter(
                (v) => v.id === "todos" || v.id === ROLES.SECRETARIO_CLASSE
            );

        return d;
    }, [user, DESTINATARIOS]);
    useEffect(() => {
        if (user && user.role === ROLES.SECRETARIO_CLASSE)
            navigate("/dashboard");
    }, [user]);
    if (isLoading) return <Loading />;
    return (
        <>
            <div className="notificacoes-page">
                <div className="notificacoes-page__header">
                    <h2>
                        <span>
                            <FontAwesomeIcon icon={faMessage} />
                        </span>
                        Enviar Notificações
                    </h2>
                </div>

                <div className="notificacoes-page__body">
                    <FormProvider {...methods}>
                        <form
                            className="notificacoes-page__form"
                            onSubmit={handleSubmit(onSubmit)}
                        >
                            <div className="notificacoes-page__dados">
                                <div className="notificacoes-page__destinatario">
                                    <p>Destinatários</p>

                                    <Controller
                                        control={control}
                                        name="destinarios"
                                        rules={{
                                            required:
                                                "O destinatário é obrigatório",
                                        }}
                                        render={({ field }) => (
                                            <Dropdown
                                                current={
                                                    destinatariosMemo.find(
                                                        (v) =>
                                                            v.id === field.value
                                                    )?.nome || null
                                                }
                                                lista={destinatariosMemo}
                                                isAll={false}
                                                selectId={field.value}
                                                onSelect={(v) =>
                                                    field.onChange(v?.id)
                                                }
                                                isErro={!!errors.destinarios}
                                            />
                                        )}
                                    />

                                    <ErroComponent error={errors.destinarios} />
                                </div>

                                <div className="notificacoes-page__titulo">
                                    <div className="notificacoes-page__titulo--container">
                                        <label htmlFor="notificacoes-titulo">
                                            Título
                                        </label>
                                        <input
                                            type="text"
                                            id="notificacoes-titulo"
                                            {...register("titulo", {
                                                maxLength: {
                                                    value: 65,
                                                    message: "Título inválido",
                                                },
                                            })}
                                            className={
                                                errors.titulo && "input-error"
                                            }
                                        />
                                        <ErroComponent error={errors.titulo} />
                                    </div>
                                    <div
                                        className={`notificacoes-page__qtd ${
                                            titulo.length > 65 && "qtd-erro"
                                        }`}
                                    >
                                        <p>
                                            <span>{titulo.length}</span>/65
                                        </p>
                                    </div>
                                </div>

                                <div className="notificacoes-page__mensagem">
                                    <div className="notificacoes-page__mensagem--container">
                                        <label htmlFor="notificacoes-mensagem">
                                            Mensagem
                                        </label>
                                        <textarea
                                            className={
                                                errors.mensagem && "input-error"
                                            }
                                            id="notificacoes-mensagem"
                                            {...register("mensagem", {
                                                maxLength: {
                                                    value: 240,
                                                    message:
                                                        "Mensagem Inválida",
                                                },
                                            })}
                                        ></textarea>
                                        <ErroComponent
                                            error={errors.mensagem}
                                        />
                                    </div>
                                    <div
                                        className={`notificacoes-page__qtd ${
                                            mensagem.length > 240 && "qtd-erro"
                                        }`}
                                    >
                                        <p>
                                            <span>{mensagem.length}</span>/240
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="notificacoes-page__preview">
                                <div className="notificacoes-page__preview-title">
                                    <h3>Preview</h3>
                                </div>
                                <div className="notificacoes-page__preview--container">
                                    <div className="notificacoes-page__preview--top">
                                        <div className="notificacoes-page__preview--img">
                                            <img
                                                src="/web-app-manifest-192x192.png"
                                                alt="Logo Dominicando"
                                            />
                                        </div>

                                        <div className="notificacoes-page__preview--now">
                                            <p>Dominicando • agora</p>
                                        </div>
                                    </div>

                                    <div className="notificacoes-page__preview--titulo">
                                        <p>{titulo}</p>
                                    </div>

                                    <div className="notificacoes-page__preview--mensagem">
                                        <p>{mensagem}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="notificacoes-page__buttons">
                                <button title="Enviar Mensagem" type="submit">
                                    <FontAwesomeIcon icon={faPaperPlane} />
                                </button>
                            </div>
                        </form>
                    </FormProvider>
                </div>
            </div>

            <AlertModal isOpen={!!alert} {...alert!} />
        </>
    );
}

export default Notificacoes;
