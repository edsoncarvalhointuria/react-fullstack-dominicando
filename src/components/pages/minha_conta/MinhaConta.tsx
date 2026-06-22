import { useAuthContext } from "../../../context/AuthContext";
import "./minha-conta.scss";
import { FormProvider, useForm } from "react-hook-form";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUser,
    faEnvelope,
    faStar,
    faChurch,
    faChalkboardUser,
    faKey,
    faThumbsUp,
    faBroom,
    faSpinner,
    faCat,
    faD,
} from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";
import AlertModal from "../../ui/AlertModal";
import { useState, type ReactNode } from "react";
import { RolesLabel } from "../../../roles/Roles";
import { limparCache } from "../../../utils/limparCache";
import { localStorageObj } from "../../../data/localStorageObj";
import Loading from "../../layout/loading/Loading";

interface SenhaForm {
    senhaAtual: string;
    novaSenha: string;
    confirmarNovaSenha: string;
}

const TIPOS_LOADING = [
    { nome: "Gatinho Com Sono (Original)", icon: <FontAwesomeIcon icon={faCat} />, link: "/loading.webp" },
    { nome: "Logo Dominicando", icon: <FontAwesomeIcon icon={faD} />, link: "/loop.mp4" },
    { nome: "Gatinho Caçando Borboleta", icon: <FontAwesomeIcon icon={faCat} />, link: "/loading.webm" },
];
const PreviewVideo = ({ link, onClose }: { link: string; onClose: () => void }) => {
    const regex = /.+(\.mp4)|(\.webm)/;
    const isVideo = regex.test(link);

    return (
        <motion.div
            className="minha-conta__preview__overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="minha-conta__preview">
                <div className="minha-conta__preview__container">
                    {isVideo ? (
                        <video autoPlay playsInline muted loop>
                            <source src={link} />
                        </video>
                    ) : (
                        <img src={link} />
                    )}
                </div>

                <button onClick={onClose} title="Fechar Preview" type="button" className="minha-conta__preview__fechar">
                    Fechar
                </button>
            </div>
        </motion.div>
    );
};
const AnimacaoLoading = () => {
    const [currentOpcao, setCurrentOpcao] = useState<string | null>(
        localStorage.getItem(localStorageObj["dominicando-loading"]),
    );
    const [showModal, setShowModal] = useState("");
    return (
        <>
            <div className="minha-conta__card">
                <h2 className="minha-conta__card-title">
                    <FontAwesomeIcon icon={faSpinner} />
                    Tipo De Loading
                </h2>
                <div className="minha-conta__tipo-loading">
                    <p className="minha-conta__tipo-loading__subtitle">Qual tipo de loading você quer ver?</p>

                    <div className="minha-conta__tipo-loading__opcoes">
                        {TIPOS_LOADING.map((v, i) => (
                            <div
                                key={v.link}
                                className="minha-conta__tipo-loading__opcao"
                                onClick={() => {
                                    localStorage.setItem(localStorageObj["dominicando-loading"], v.link);
                                    setCurrentOpcao(v.link);
                                }}
                            >
                                <p className="minha-conta__tipo-loading__opcao__title">
                                    <i>{v.icon}</i>
                                    <span>{v.nome}</span>
                                </p>
                                <div className="minha-conta__tipo-loading__opcao__check">
                                    <input
                                        type="radio"
                                        name="animacao-opcao"
                                        id={v.link}
                                        readOnly
                                        checked={(!currentOpcao && i === 0) || currentOpcao === v.link}
                                    />
                                    <label htmlFor={v.link}></label>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowModal(v.link);
                                    }}
                                    title="Ver"
                                    className="minha-conta__tipo-loading__opcao__ver"
                                    type="button"
                                >
                                    Ver
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {showModal && <PreviewVideo link={showModal} onClose={() => setShowModal("")} />}
        </>
    );
};

function MinhaConta() {
    const [mensagem, setMensagem] = useState<{
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
    const { user, alterarSenha } = useAuthContext();
    const methods = useForm<SenhaForm>();
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = methods;
    const novaSenha = watch("novaSenha");

    const onSubmitSenha = async (dados: SenhaForm) => {
        const { senhaAtual, novaSenha } = dados;
        setIsLoading(true);
        try {
            await alterarSenha(senhaAtual, novaSenha);
            setMensagem({
                message: "Senha alterada com sucesso!",
                onCancel: () => setMensagem(null),
                onClose: () => setMensagem(null),
                onConfirm: () => setMensagem(null),
                title: "Senha alterada com sucesso",
                confirmText: "Ok",
                icon: <FontAwesomeIcon icon={faThumbsUp} />,
                cancelText: "Cancelar",
            });
        } catch {
            setMensagem({
                message: "A senha atual está inválida. Tente novamente.",
                onCancel: () => setMensagem(null),
                onClose: () => setMensagem(null),
                onConfirm: () => setMensagem(null),
                title: "Erro ao alterar a senha",
                confirmText: "Ok",
                cancelText: "Cancelar",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!user || isLoading) return <Loading />;
    return (
        <>
            <motion.div
                className="minha-conta"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
            >
                <div className="minha-conta__card">
                    <h2 className="minha-conta__card-title">
                        <FontAwesomeIcon icon={faUser} />
                        Minhas Informações
                    </h2>
                    <div className="minha-conta__info-grid">
                        <div className="info-item">
                            <h3>
                                <FontAwesomeIcon icon={faUser} /> Nome
                            </h3>
                            <p>{user.nome}</p>
                        </div>
                        <div className="info-item">
                            <h3>
                                <FontAwesomeIcon icon={faEnvelope} /> E-mail
                            </h3>
                            <p>{user.email}</p>
                        </div>
                        <div className="info-item">
                            <h3>
                                <FontAwesomeIcon icon={faStar} /> Cargo
                            </h3>
                            <p>{RolesLabel[user.role]}</p>
                        </div>
                        <div className="info-item">
                            <h3>
                                <FontAwesomeIcon icon={faChurch} /> Igreja
                            </h3>
                            <p>{user.igrejaNome}</p>
                        </div>
                        {user.classeNome && (
                            <div className="info-item">
                                <h3>
                                    <FontAwesomeIcon icon={faChalkboardUser} /> Classe
                                </h3>
                                <p>{user.classeNome}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="minha-conta__card">
                    <h2 className="minha-conta__card-title">
                        <FontAwesomeIcon icon={faBroom} />
                        Limpar Cache?
                    </h2>
                    <div className="minha-conta__notificao">
                        <div className="minha-conta__notificao--info">
                            {/* <p>Limpar Cache?</p> */}
                            <button className="minha-conta__submit-btn" onClick={limparCache}>
                                Atualizar App
                            </button>
                        </div>
                    </div>
                </div>

                <AnimacaoLoading />

                <div className="minha-conta__card">
                    <h2 className="minha-conta__card-title">
                        <FontAwesomeIcon icon={faKey} />
                        Alterar Senha
                    </h2>
                    <FormProvider {...methods}>
                        <form className="minha-conta__form" onSubmit={handleSubmit(onSubmitSenha)}>
                            <div className="form-group">
                                <label htmlFor="senhaAtual">Senha Atual</label>
                                <input
                                    type="password"
                                    id="senhaAtual"
                                    className={errors.senhaAtual && "input-error"}
                                    {...register("senhaAtual", {
                                        required: "A senha atual é obrigatória.",
                                    })}
                                />
                                {errors.senhaAtual && <p className="form-error">{errors.senhaAtual.message}</p>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="novaSenha">Nova Senha</label>
                                <input
                                    type="password"
                                    id="novaSenha"
                                    className={errors.novaSenha && "input-error"}
                                    {...register("novaSenha", {
                                        required: "A nova senha é obrigatória.",
                                        minLength: {
                                            value: 6,
                                            message: "A senha deve ter no mínimo 6 caracteres.",
                                        },
                                    })}
                                />
                                {errors.novaSenha && <p className="form-error">{errors.novaSenha.message}</p>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="confirmarNovaSenha">Confirmar Nova Senha</label>
                                <input
                                    type="password"
                                    id="confirmarNovaSenha"
                                    className={errors.confirmarNovaSenha && "input-error"}
                                    {...register("confirmarNovaSenha", {
                                        required: "A confirmação é obrigatória.",
                                        validate: (value) => value === novaSenha || "As senhas não correspondem.",
                                    })}
                                />
                                {errors.confirmarNovaSenha && (
                                    <p className="form-error">{errors.confirmarNovaSenha.message}</p>
                                )}
                            </div>
                            <button type="submit" className="minha-conta__submit-btn">
                                Salvar Nova Senha
                            </button>
                        </form>
                    </FormProvider>
                </div>
            </motion.div>

            <AlertModal isOpen={!!mensagem} {...mensagem!} />
        </>
    );
}

export default MinhaConta;
