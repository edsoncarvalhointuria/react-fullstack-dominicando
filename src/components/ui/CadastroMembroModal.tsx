import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import "./cadastro-aluno-modal.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAddressCard, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FormProvider, useForm, type FieldError } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import LoadingModal from "../layout/loading/LoadingModal";
import AlertModal from "./AlertModal";
import type { MembroInterface } from "../../interfaces/MembroInterface";

interface CadastroMembro {
    nome_completo: string;
    data_nascimento: string;
    contato: string;
    validade: string;
    registro: string;
}

const functions = getFunctions();
const salvarMembro = httpsCallable(functions, "salvarMembro");

const variantsForm: Variants = {
    initial: {},
    animate: { transition: { delayChildren: stagger(0.1) } },
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

const ErroComponent = ({ error }: { error: FieldError | undefined }) => {
    return (
        <AnimatePresence>
            {error && (
                <motion.div
                    variants={variantsErro}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="cadastro-aluno__input-erro"
                >
                    <p>{error.message}</p>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

function CadastroMembroModal({
    onCancel,
    onSave,
    igrejaId,
    membroId = "",
}: {
    onCancel: () => void;
    onSave: (data: MembroInterface) => void;
    igrejaId: string;
    membroId?: string;
}) {
    const methods = useForm<CadastroMembro>();
    const $container = useRef<HTMLDivElement>(null);
    const {
        register,
        reset,
        handleSubmit,
        formState: { errors },
    } = methods;
    const [isEnviando, setIsEnviando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState("");

    const onSubmit = (dados: CadastroMembro) => {
        setIsEnviando(true);
        const envio = { dados, igrejaId, membroId };
        salvarMembro(envio)
            .then(({ data }) => {
                const result = data as any;
                const dadosAtualizados: MembroInterface = {
                    ...result,
                    data_nascimento: result.data_nascimento
                        ? new Timestamp(
                              result.data_nascimento._seconds,
                              result.data_nascimento._nanoseconds
                          )
                        : null,
                    validade: result.validade
                        ? new Timestamp(
                              result.validade._seconds,
                              result.validade._nanoseconds
                          )
                        : null,
                };
                onSave(dadosAtualizados);
                onCancel();
                console.log("membro salvo...");
            })
            .catch((err) => {
                console.log("deu esse erro", err);
                setMensagemErro(err.message);
            })
            .finally(() => setIsEnviando(false));
    };

    useEffect(() => {
        const getMembro = async () => {
            const membroDoc = doc(db, "membros", membroId);
            const alunoSnap = await getDoc(membroDoc);

            if (!alunoSnap.exists()) return;

            const membro = {
                id: alunoSnap.id,
                ...alunoSnap.data(),
            } as MembroInterface;

            reset({
                data_nascimento: membro.data_nascimento
                    .toDate()
                    .toISOString()
                    .split("T")[0],
                nome_completo: membro.nome_completo,
                contato: membro.contato || "",
                registro: membro.registro || undefined,
                validade: membro?.validade
                    ? membro?.validade.toDate().toISOString().split("T")[0]
                    : undefined,
            });
        };
        if (membroId) {
            getMembro();
        } else
            reset({
                nome_completo: "",
                data_nascimento: "",
                contato: "",
                registro: "",
                validade: "",
            });
    }, [membroId, reset]);

    return (
        <>
            <motion.div
                ref={$container}
                className="cadastro-aluno-overlay"
                onClick={!isEnviando ? onCancel : undefined}
                exit={{ scale: 0, transition: { duration: 0.2 } }}
            >
                <motion.div
                    drag
                    dragConstraints={$container}
                    dragElastic={0.1}
                    variants={variantsForm}
                    initial="initial"
                    animate="animate"
                    exit={"initial"}
                    className="cadastro-aluno"
                    onClick={(e) => e.stopPropagation()}
                >
                    <LoadingModal isEnviando={isEnviando} />
                    <div className="cadastro-aluno__header">
                        <div className="cadastro-aluno__title">
                            <FontAwesomeIcon icon={faAddressCard} />
                            <h2>Cadastrar Novo Membro</h2>
                        </div>
                        <button
                            className="cadastro-aluno__close"
                            onClick={onCancel}
                        >
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>

                    <div className="cadastro-aluno__body">
                        <FormProvider {...methods}>
                            <form
                                className="cadastro-aluno__form"
                                onSubmit={handleSubmit(onSubmit)}
                            >
                                {/* Nome */}
                                <motion.div
                                    variants={variantsItem}
                                    className="cadastro-aluno__form-item"
                                >
                                    <div className="cadastro-aluno__input">
                                        <label htmlFor="cadastro-membro-nome">
                                            Nome Completo*
                                        </label>
                                        <input
                                            type="text"
                                            id="cadastro-membro-nome"
                                            {...register("nome_completo", {
                                                required:
                                                    "O campo de nome é obrigatório",
                                            })}
                                            className={
                                                errors.nome_completo
                                                    ? "input-error"
                                                    : ""
                                            }
                                        />
                                    </div>
                                    <ErroComponent
                                        error={errors.nome_completo}
                                    />
                                </motion.div>

                                {/* Nascimento e Contato */}
                                <div className="cadastro-aluno__form-group">
                                    {/* Data Nascimento */}
                                    <motion.div
                                        variants={variantsItem}
                                        className="cadastro-aluno__form-item"
                                    >
                                        <div className="cadastro-aluno__input">
                                            <label htmlFor="cadastro-membro-data-nascimento">
                                                Data Nascimento*
                                            </label>
                                            <input
                                                type="date"
                                                id="cadastro-membro-data-nascimento"
                                                max={
                                                    new Date()
                                                        .toISOString()
                                                        .split("T")[0]
                                                }
                                                {...register(
                                                    "data_nascimento",
                                                    {
                                                        required:
                                                            "A data é obrigatória",
                                                    }
                                                )}
                                                className={
                                                    errors.data_nascimento
                                                        ? "input-error"
                                                        : ""
                                                }
                                            />
                                        </div>
                                        <ErroComponent
                                            error={errors.data_nascimento}
                                        />
                                    </motion.div>

                                    {/* Contato */}
                                    <motion.div
                                        variants={variantsItem}
                                        className="cadastro-aluno__form-item"
                                    >
                                        <div className="cadastro-aluno__input">
                                            <label htmlFor="cadastro-membro-contato">
                                                Contato
                                            </label>
                                            <input
                                                type="text"
                                                id="cadastro-membro-contato"
                                                className={
                                                    errors.contato
                                                        ? "input-error"
                                                        : ""
                                                }
                                                placeholder="(11) 99999-9999"
                                                {...register("contato", {
                                                    validate: (value) => {
                                                        if (!value) return true;
                                                        const regex =
                                                            /\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g;
                                                        return (
                                                            regex.test(
                                                                value.trim()
                                                            ) ||
                                                            "Número invalido"
                                                        );
                                                    },
                                                })}
                                            />
                                        </div>
                                        <ErroComponent error={errors.contato} />
                                    </motion.div>
                                </div>

                                {/* Validade e Registro */}
                                <div className="cadastro-aluno__form-group">
                                    {/* Validade */}
                                    <motion.div
                                        variants={variantsItem}
                                        className="cadastro-aluno__form-item"
                                    >
                                        <div className="cadastro-aluno__input">
                                            <label htmlFor="cadastro-membro-validade">
                                                Validade
                                            </label>
                                            <input
                                                type="date"
                                                id="cadastro-membro-validade"
                                                {...register("validade")}
                                                className={
                                                    errors.validade
                                                        ? "input-error"
                                                        : ""
                                                }
                                            />
                                        </div>
                                        <ErroComponent
                                            error={errors.validade}
                                        />
                                    </motion.div>

                                    {/* Registro */}
                                    <motion.div
                                        variants={variantsItem}
                                        className="cadastro-aluno__form-item"
                                    >
                                        <div className="cadastro-aluno__input">
                                            <label htmlFor="cadastro-membro-registro">
                                                Registro
                                            </label>
                                            <input
                                                type="text"
                                                id="cadastro-membro-registro"
                                                className={
                                                    errors.registro
                                                        ? "input-error"
                                                        : ""
                                                }
                                                {...register("registro")}
                                            />
                                        </div>
                                        <ErroComponent
                                            error={errors.registro}
                                        />
                                    </motion.div>
                                </div>

                                <motion.div
                                    variants={variantsItem}
                                    className="cadastro-aluno__buttons"
                                >
                                    <button
                                        type="button"
                                        className="button-secondary"
                                        disabled={isEnviando}
                                        onClick={onCancel}
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="submit"
                                        className="button-primary"
                                        disabled={isEnviando}
                                    >
                                        {membroId
                                            ? "Editar Membro"
                                            : "Salvar Membro"}
                                    </button>
                                </motion.div>
                            </form>
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

export default CadastroMembroModal;
