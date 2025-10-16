import { faCircleUser, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    Controller,
    FormProvider,
    useForm,
    type FieldError,
} from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import Dropdown from "./Dropdown";
import { useAuthContext } from "../../context/AuthContext";
import { useDataContext } from "../../context/DataContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import "./cadastro-usuario-modal.scss";
import { getFunctions, httpsCallable } from "firebase/functions";
import LoadingModal from "../layout/loading/LoadingModal";
import AlertModal from "./AlertModal";
import type { Roles } from "../../roles/RolesType";
import { ROLES, RolesLabel } from "../../roles/Roles";
import type { UsuarioInterface } from "../../interfaces/UsuarioInterface";

interface Form {
    nome: string;
    email: string;
    senha: string;
    role: Roles;
    igrejaId: string;
    classeId: string | undefined;
}

const variantsForm: Variants = {
    initial: {},
    animate: { transition: { delayChildren: stagger(0.1) } },
    exit: {},
};
const variantsItem: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
};
const variantsErro: Variants = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0, opacity: 0 },
};

const ROLES_LIST: { nome: string; id: Roles }[] = [
    { nome: RolesLabel[ROLES.PASTOR_PRESIDENTE], id: ROLES.PASTOR_PRESIDENTE },
    { nome: RolesLabel[ROLES.SUPER_ADMIN], id: ROLES.SUPER_ADMIN },
    { nome: RolesLabel[ROLES.PASTOR], id: ROLES.PASTOR },
    {
        nome: RolesLabel[ROLES.SECRETARIO_CONGREGACAO],
        id: ROLES.SECRETARIO_CONGREGACAO,
    },
    { nome: RolesLabel[ROLES.SECRETARIO_CLASSE], id: ROLES.SECRETARIO_CLASSE },
];

const functions = getFunctions();
const salvarUsuario = httpsCallable(functions, "salvarUsuario");

function CadastroUsuarioModal({
    usuarioId,
    onSave,
    onCancel,
}: {
    usuarioId?: string;
    onSave: (data: UsuarioInterface) => void;
    onCancel: () => void;
}) {
    const { isSecretario, isAdmin, user } = useAuthContext();
    const { classes, igrejas } = useDataContext();
    const methods = useForm<Form>();
    const {
        register,
        reset,
        handleSubmit,
        setValue,
        control,
        formState: { errors },
    } = methods;

    const [showSenha, setShowSenha] = useState(false);
    const [key, setKey] = useState(0);
    const [isEnviando, setIsEnviando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState("");
    const [roles, setRoles] = useState(ROLES_LIST);
    const [currentIgreja, setCurrentIgreja] = useState<IgrejaInterface | null>(
        null
    );
    const [currentRole, setCurrentRole] = useState<{
        nome: string;
        id: Roles;
    } | null>(null);

    const onSubmit = (dados: Form) => {
        setIsEnviando(true);
        const envio = { dados, usuarioId };

        salvarUsuario(envio)
            .then(({ data }) => {
                const resultado = data as any;
                onSave(resultado);
                onCancel();
            })
            .catch((err) => {
                console.log("deu esse erro", err);
                setMensagemErro(err.message);
            })
            .finally(() => setIsEnviando(false));
    };
    const ErroMenssage = (erro: FieldError) => {
        return (
            <motion.div
                variants={variantsErro}
                className="cadastro-usuario__form-erro"
            >
                {erro.message}
            </motion.div>
        );
    };

    const classesMemo = useMemo(() => {
        let c = classes;
        if (currentIgreja) c = c.filter((v) => v.igrejaId === currentIgreja.id);

        return c;
    }, [currentIgreja]);
    useEffect(() => {
        const getUsuario = async () => {
            if (!usuarioId) return;
            const d = doc(db, "usuarios", usuarioId);
            const snap = await getDoc(d);

            if (!snap.exists()) return;

            const usuario = { id: snap.id, ...snap.data() } as UsuarioInterface;

            return usuario;
        };
        if (user)
            if (usuarioId === user.uid) {
                setRoles(roles.filter((v) => v.id === user.role));
            } else if (user.role === ROLES.SECRETARIO_CONGREGACAO)
                setRoles(
                    ROLES_LIST.filter(
                        (v) =>
                            v.id !== "pastor_presidente" &&
                            v.id !== "super_admin" &&
                            v.id !== "pastor"
                    )
                );
            else if (user.role === ROLES.SUPER_ADMIN)
                setRoles(
                    ROLES_LIST.filter((v) => v.id !== "pastor_presidente")
                );
            else if (isAdmin.current)
                setRoles(
                    ROLES_LIST.filter(
                        (v) =>
                            v.id !== "pastor_presidente" &&
                            v.id !== "super_admin"
                    )
                );
            else if (isSecretario.current)
                setRoles(
                    ROLES_LIST.filter((v) => v.id === "secretario_classe")
                );
        if (usuarioId)
            getUsuario()
                .then((v) => {
                    if (v)
                        reset({
                            classeId: v.classeId || undefined,
                            email: v.email,
                            nome: v.nome,
                            igrejaId: v.igrejaId,
                            role: v.role as Roles,
                            senha: "",
                        });
                    else
                        reset({
                            classeId: "",
                            email: "",
                            nome: "",
                            igrejaId: "",
                            senha: "",
                        });
                })
                .catch((err) => console.log("deu esse erro", err));
    }, [user, reset]);
    return (
        <>
            <motion.div
                className="cadastro-usuario__overflow"
                onClick={onCancel}
                exit={{
                    opacity: 0,
                    transition: { duration: 0.2 },
                }}
            >
                <motion.div
                    className="cadastro-usuario"
                    onClick={(evt) => evt.stopPropagation()}
                >
                    <LoadingModal isEnviando={isEnviando} />
                    <div className="cadastro-usuario__header">
                        <div className="cadastro-usuario__title">
                            <FontAwesomeIcon icon={faCircleUser} />
                            <h2>Cadastrar Novo Usuário</h2>
                        </div>

                        <div
                            className="cadastro-usuario__close"
                            onClick={() => onCancel()}
                        >
                            <FontAwesomeIcon icon={faXmark} />
                        </div>
                    </div>

                    <div className="cadastro-usuario__body">
                        <FormProvider {...methods}>
                            <motion.form
                                variants={variantsForm}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="cadastro-usuario__form"
                                onSubmit={handleSubmit(onSubmit)}
                            >
                                <motion.div
                                    variants={variantsItem}
                                    className="cadastro-usuario__form-input"
                                    style={{ zIndex: 9 }}
                                >
                                    <p>Cargo*</p>
                                    <Controller
                                        name="role"
                                        control={control}
                                        rules={{
                                            required: "O cargo é obrigatório",
                                        }}
                                        render={({ field }) => (
                                            <Dropdown
                                                lista={roles}
                                                current={
                                                    roles.find(
                                                        (v) =>
                                                            v.id === field.value
                                                    )?.nome || null
                                                }
                                                onSelect={(v) => {
                                                    setCurrentRole(v);
                                                    field.onChange(
                                                        v?.id || null
                                                    );
                                                }}
                                                isAll={false}
                                                isErro={!!errors.role}
                                            />
                                        )}
                                    />
                                    {errors.role && ErroMenssage(errors.role)}
                                </motion.div>

                                <motion.div
                                    variants={variantsItem}
                                    className="cadastro-usuario__form-input"
                                >
                                    <p>Igreja*</p>
                                    <Controller
                                        name="igrejaId"
                                        control={control}
                                        rules={{
                                            required: "A igreja é obrigatória.",
                                        }}
                                        render={({ field }) => (
                                            <Dropdown
                                                lista={igrejas}
                                                current={
                                                    igrejas.find(
                                                        (v) =>
                                                            v.id === field.value
                                                    )?.nome || null
                                                }
                                                onSelect={(v) => {
                                                    setValue(
                                                        "classeId",
                                                        undefined
                                                    );
                                                    setCurrentIgreja(v);
                                                    field.onChange(
                                                        v?.id || null
                                                    );
                                                }}
                                                isAll={false}
                                                isErro={!!errors.igrejaId}
                                            />
                                        )}
                                    />
                                    {errors.igrejaId &&
                                        ErroMenssage(errors.igrejaId)}
                                </motion.div>

                                <AnimatePresence>
                                    {currentRole?.id ===
                                        "secretario_classe" && (
                                        <motion.div
                                            variants={variantsItem}
                                            key="secretario-classe-input"
                                            className="cadastro-usuario__form-input"
                                        >
                                            <p>Classe*</p>
                                            <Controller
                                                name="classeId"
                                                control={control}
                                                rules={{
                                                    required:
                                                        'O cargo "secretário de classe", exige que uma classe seja selecionada',
                                                }}
                                                render={({ field }) => (
                                                    <Dropdown
                                                        lista={classesMemo}
                                                        isAll={false}
                                                        current={
                                                            classesMemo.find(
                                                                (v) =>
                                                                    v.id ===
                                                                    field.value
                                                            )?.nome || null
                                                        }
                                                        onSelect={(v) => {
                                                            field.onChange(
                                                                v?.id || null
                                                            );
                                                        }}
                                                        isErro={
                                                            !!errors.classeId
                                                        }
                                                    />
                                                )}
                                            />

                                            {errors.classeId &&
                                                ErroMenssage(errors.classeId)}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <motion.div
                                    variants={variantsItem}
                                    className="cadastro-usuario__form-input"
                                >
                                    <label htmlFor="cadastro-usuario-nome">
                                        Nome Completo*
                                    </label>
                                    <input
                                        className={errors.nome && "input-error"}
                                        type="text"
                                        id="cadastro-usuario-nome"
                                        {...register("nome", {
                                            required: "O nome é obrigatório",
                                            minLength: {
                                                value: 3,
                                                message:
                                                    "O nome deve ter pelo menos 3 caracteres.",
                                            },
                                        })}
                                    />

                                    {errors.nome && ErroMenssage(errors.nome)}
                                </motion.div>

                                {(!usuarioId || !isSecretario.current) && (
                                    <motion.div
                                        variants={variantsItem}
                                        className="cadastro-usuario__form-group"
                                    >
                                        <div className="cadastro-usuario__form-input">
                                            <label htmlFor="cadastro-usuario-email">
                                                E-mail*
                                            </label>
                                            <input
                                                type="email"
                                                className={
                                                    errors.email &&
                                                    "input-error"
                                                }
                                                placeholder="email@dominio.com"
                                                id="cadastro-usuario-email"
                                                {...register("email", {
                                                    required:
                                                        "O email é obrigatório",
                                                    validate: (value) => {
                                                        const regex =
                                                            /^[A-Za-z0-9][A-Za-z0-9._+-]+@[A-Za-z0-9][A-Za-z0-9._-]+\.[A-Za-z]{2,}$/u;
                                                        return (
                                                            regex.test(value) ||
                                                            "Formato de email invalido;"
                                                        );
                                                    },
                                                })}
                                            />
                                            {errors.email &&
                                                ErroMenssage(errors.email)}
                                        </div>
                                        <div className="cadastro-usuario__form-input">
                                            <label htmlFor="cadastro-usuario-senha">
                                                Senha*
                                            </label>
                                            <div className="cadastro-usuario__form-input--senha">
                                                <input
                                                    type={
                                                        showSenha
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    className={
                                                        errors.senha &&
                                                        "input-error"
                                                    }
                                                    id="cadastro-usuario-senha"
                                                    {...register("senha", {
                                                        required: {
                                                            value: usuarioId
                                                                ? false
                                                                : true,
                                                            message:
                                                                "A senha é obrigatória",
                                                        },
                                                        minLength: {
                                                            value: 6,
                                                            message:
                                                                "A senha deve ter pelo menos 6 caracteres.",
                                                        },
                                                    })}
                                                />
                                                <motion.div
                                                    className="cadastro-usuario__form-input--image"
                                                    onMouseOver={() =>
                                                        setKey((v) => v + 1)
                                                    }
                                                    onTap={() =>
                                                        setShowSenha((v) => !v)
                                                    }
                                                >
                                                    <img
                                                        src={`/eye${
                                                            showSenha
                                                                ? "-close"
                                                                : ""
                                                        }.gif?key=${key}`}
                                                        alt="Ver senha"
                                                    />
                                                </motion.div>
                                            </div>
                                            {errors.senha &&
                                                ErroMenssage(errors.senha)}
                                        </div>
                                    </motion.div>
                                )}

                                <div className="cadastro-usuario__form-buttons">
                                    <div className="cadastro-usuario__form-cancel">
                                        <button
                                            title="Cancelar"
                                            type="button"
                                            disabled={isEnviando}
                                            onClick={() => onCancel()}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                    <motion.div
                                        whileTap={{ scale: 0.9 }}
                                        className="cadastro-usuario__form-submit"
                                    >
                                        <button
                                            title="Salvar Usuário"
                                            type="submit"
                                            disabled={isEnviando}
                                        >
                                            {usuarioId
                                                ? "Editar Usuário"
                                                : "Cadastrar Usuário"}
                                        </button>
                                    </motion.div>
                                </div>
                            </motion.form>
                        </FormProvider>
                    </div>
                </motion.div>
            </motion.div>

            <AlertModal
                isOpen={!!mensagemErro}
                message={mensagemErro}
                title="Erro ao salvar"
                onCancel={onCancel}
                onClose={onCancel}
                onConfirm={onCancel}
                cancelText="Cancelar"
                confirmText="Ok"
            />
        </>
    );
}

export default CadastroUsuarioModal;
