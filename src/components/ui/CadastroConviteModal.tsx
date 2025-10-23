import {
    faCircleCheck,
    faCopy,
    faEnvelopeOpen,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    Controller,
    FormProvider,
    useForm,
    type FieldError,
} from "react-hook-form";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import Dropdown from "./Dropdown";
import { useAuthContext } from "../../context/AuthContext";
import { useDataContext } from "../../context/DataContext";
import "./cadastro-convite-modal.scss";
import { getFunctions, httpsCallable } from "firebase/functions";
import LoadingModal from "../layout/loading/LoadingModal";
import AlertModal from "./AlertModal";
import type { Roles } from "../../roles/RolesType";
import { ROLES, RolesLabel } from "../../roles/Roles";

interface Form {
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
const gerarCodigoConvite = httpsCallable(functions, "gerarCodigoConvite");

function CadastroConviteModal({ onCancel }: { onCancel: () => void }) {
    const { isSecretario, user, isAdmin } = useAuthContext();
    const { classes, igrejas } = useDataContext();
    const methods = useForm<Form>();
    const {
        handleSubmit,
        setValue,
        control,
        formState: { errors },
    } = methods;

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
    const [retorno, setRetorno] = useState<{
        codigo: string;
        dataExpiracao: string;
    } | null>(null);
    const [copiadoCode, setCopiadoCode] = useState(false);
    const [copiadoLink, setCopiadoLink] = useState(false);

    const timeoutRef = useRef(0);

    const onSubmit = (dados: Form) => {
        setIsEnviando(true);
        gerarCodigoConvite(dados)
            .then(({ data }) => {
                setRetorno(data as any);
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
        if (copiadoCode)
            timeoutRef.current = setTimeout(
                () => setCopiadoCode(false),
                2000
            ) as any;
        if (copiadoLink)
            timeoutRef.current = setTimeout(
                () => setCopiadoLink(false),
                2000
            ) as any;

        return () => clearTimeout(timeoutRef.current);
    }, [copiadoCode, copiadoLink]);
    useEffect(() => {
        if (user) {
            if (isSecretario.current) onCancel();
            if (isAdmin.current)
                setRoles(
                    ROLES_LIST.filter(
                        (v) =>
                            v.id !== ROLES.PASTOR_PRESIDENTE &&
                            v.id !== ROLES.SUPER_ADMIN
                    )
                );
            if (user.role === ROLES.SUPER_ADMIN)
                setRoles(
                    ROLES_LIST.filter((v) => v.id !== ROLES.PASTOR_PRESIDENTE)
                );
        }
    }, [user]);
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
                    {!retorno ? (
                        <>
                            <div className="cadastro-usuario__header">
                                <div className="cadastro-usuario__title">
                                    <FontAwesomeIcon icon={faEnvelopeOpen} />
                                    <h2>Convite de Cadastro</h2>
                                </div>

                                <div
                                    className="cadastro-usuario__close"
                                    onClick={() => onCancel()}
                                >
                                    <FontAwesomeIcon icon={faXmark} />
                                </div>
                            </div>

                            <div className="cadastro-usuario__body cadastro-convite-modal__body">
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
                                            <p>Cargo</p>
                                            <Controller
                                                name="role"
                                                control={control}
                                                rules={{
                                                    required:
                                                        "O cargo é obrigatório",
                                                }}
                                                render={({ field }) => (
                                                    <Dropdown
                                                        lista={roles}
                                                        current={
                                                            roles.find(
                                                                (v) =>
                                                                    v.id ===
                                                                    field.value
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
                                            {errors.role &&
                                                ErroMenssage(errors.role)}
                                        </motion.div>

                                        <motion.div
                                            variants={variantsItem}
                                            className="cadastro-usuario__form-input"
                                        >
                                            <p>Igreja</p>
                                            <Controller
                                                name="igrejaId"
                                                control={control}
                                                rules={{
                                                    required:
                                                        "A igreja é obrigatória.",
                                                }}
                                                render={({ field }) => (
                                                    <Dropdown
                                                        lista={igrejas}
                                                        current={
                                                            igrejas.find(
                                                                (v) =>
                                                                    v.id ===
                                                                    field.value
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
                                                        isErro={
                                                            !!errors.igrejaId
                                                        }
                                                    />
                                                )}
                                            />
                                            {errors.igrejaId &&
                                                ErroMenssage(errors.igrejaId)}
                                        </motion.div>

                                        <AnimatePresence>
                                            {(currentRole?.id ===
                                                ROLES.SECRETARIO_CLASSE ||
                                                currentRole?.id ===
                                                    ROLES.PROFESSOR) && (
                                                <motion.div
                                                    variants={variantsItem}
                                                    key="secretario-classe-input"
                                                    className="cadastro-usuario__form-input"
                                                >
                                                    <p>Classe</p>
                                                    <Controller
                                                        name="classeId"
                                                        control={control}
                                                        rules={{
                                                            required:
                                                                'O cargo "secretário de classe", exige que uma classe seja selecionada',
                                                        }}
                                                        render={({ field }) => (
                                                            <Dropdown
                                                                lista={
                                                                    classesMemo
                                                                }
                                                                isAll={false}
                                                                current={
                                                                    classesMemo.find(
                                                                        (v) =>
                                                                            v.id ===
                                                                            field.value
                                                                    )?.nome ||
                                                                    null
                                                                }
                                                                onSelect={(
                                                                    v
                                                                ) => {
                                                                    field.onChange(
                                                                        v?.id ||
                                                                            null
                                                                    );
                                                                }}
                                                                isErro={
                                                                    !!errors.classeId
                                                                }
                                                            />
                                                        )}
                                                    />

                                                    {errors.classeId &&
                                                        ErroMenssage(
                                                            errors.classeId
                                                        )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

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
                                                    Gerar convite
                                                </button>
                                            </motion.div>
                                        </div>
                                    </motion.form>
                                </FormProvider>
                            </div>
                        </>
                    ) : (
                        <div className="cadastro-convite-modal">
                            <div className="cadastro-convite-modal__data">
                                <p>
                                    O código vai expirar em{" "}
                                    {retorno.dataExpiracao}
                                </p>
                            </div>
                            <div className="cadastro-convite-modal__infos">
                                <div
                                    className="cadastro-convite-modal__code"
                                    onClick={() => {
                                        setCopiadoCode(true);
                                        setCopiadoLink(false);
                                        navigator.clipboard.writeText(
                                            retorno.codigo
                                        );
                                    }}
                                >
                                    <p>{retorno.codigo}</p>
                                    {!copiadoCode ? (
                                        <motion.span exit={{ opacity: 0 }}>
                                            <FontAwesomeIcon icon={faCopy} />
                                        </motion.span>
                                    ) : (
                                        <motion.span exit={{ opacity: 0 }}>
                                            <FontAwesomeIcon
                                                icon={faCircleCheck}
                                            />
                                        </motion.span>
                                    )}
                                </div>
                                <div
                                    className="cadastro-convite-modal__link"
                                    onClick={() => {
                                        setCopiadoLink(true);
                                        navigator.clipboard.writeText(
                                            `${window.location.origin}/cadastrar/usuario/${retorno.codigo}`
                                        );
                                        setCopiadoCode(false);
                                    }}
                                >
                                    <p>
                                        {window.location.origin}
                                        /cadastrar/usuario/
                                        {retorno.codigo}
                                    </p>
                                    {!copiadoLink ? (
                                        <motion.span exit={{ opacity: 0 }}>
                                            <FontAwesomeIcon icon={faCopy} />
                                        </motion.span>
                                    ) : (
                                        <motion.span exit={{ opacity: 0 }}>
                                            <FontAwesomeIcon
                                                icon={faCircleCheck}
                                            />
                                        </motion.span>
                                    )}
                                </div>
                            </div>

                            <div className="cadastro-convite-modal__fechar">
                                <button onClick={onCancel} title="Fechar">
                                    Fechar
                                </button>
                            </div>
                        </div>
                    )}
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

export default CadastroConviteModal;
