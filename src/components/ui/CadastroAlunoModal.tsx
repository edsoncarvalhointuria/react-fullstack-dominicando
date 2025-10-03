import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import "./cadastro-aluno-modal.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    Timestamp,
    where,
} from "firebase/firestore";
import { db } from "../../utils/firebase";
import type { AlunoInterface } from "../../interfaces/AlunoInterface";
import { getFunctions, httpsCallable } from "firebase/functions";
import LoadingModal from "../layout/loading/LoadingModal";
import AlertModal from "./AlertModal";
import type { VisitanteInterface } from "../../interfaces/VisitantesInterface";
import type { MembroInterface } from "../../interfaces/MembroInterface";
import Dropdown from "./Dropdown";

interface CadastroAluno {
    nome_completo: string;
    data_nascimento: string;
    isMembro: boolean;
    membroId?: string;
    contato: string;
}

const functions = getFunctions();
const salvarAluno = httpsCallable(functions, "salvarAluno");

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

function CadastroAlunoModal({
    onCancel,
    onSave,
    igrejaId,
    alunoId = "",
    type = "aluno",
}: {
    onCancel: () => void;
    onSave: (data: AlunoInterface) => void;
    igrejaId: string;
    alunoId?: string;
    type?: "visita" | "aluno";
}) {
    const methods = useForm<CadastroAluno>({
        defaultValues: {
            isMembro: false,
        },
    });
    const $container = useRef<HTMLDivElement>(null);
    const {
        register,
        reset,
        handleSubmit,
        control,
        watch,
        formState: { errors },
    } = methods;
    const { isMembro } = watch();
    const [isEnviando, setIsEnviando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState("");
    const [membros, setMembros] = useState<
        (MembroInterface & { nome: string })[]
    >([]);
    const [currentMembro, setCurrentMembro] = useState<MembroInterface | null>(
        null
    );

    const onSubmit = (dados: CadastroAluno) => {
        if (type === "aluno") {
            setIsEnviando(true);
            const envio = { dados, igrejaId, alunoId };
            salvarAluno(envio)
                .then(({ data }) => {
                    const result = data as any;
                    const dadosAtualizados: AlunoInterface = {
                        ...result,
                        data_nascimento: new Timestamp(
                            result.data_nascimento._seconds,
                            result.data_nascimento._nanoseconds
                        ),
                    };
                    onSave(dadosAtualizados);
                    onCancel();
                    console.log("aluno salvo...");
                })
                .catch((err) => {
                    console.log("deu esse erro", err);
                    setMensagemErro(err.message);
                })
                .finally(() => setIsEnviando(false));
        } else {
            setIsEnviando(true);
            const dadosSeguros = {
                visitaId: alunoId,
                contato: dados.contato || null,
                data_nascimento: dados.data_nascimento || null,
                nome_completo: dados.nome_completo,
            };
            onSave(dadosSeguros as any);
        }
    };

    useEffect(() => {
        const getAluno = async () => {
            const alunoDoc = doc(db, "alunos", alunoId);
            const alunoSnap = await getDoc(alunoDoc);

            if (!alunoSnap.exists()) return;

            const aluno = {
                id: alunoSnap.id,
                ...alunoSnap.data(),
            } as AlunoInterface;

            reset({
                data_nascimento: aluno.data_nascimento
                    .toDate()
                    .toISOString()
                    .split("T")[0],
                nome_completo: aluno.nome_completo,
                contato: aluno.contato || "",
                isMembro: aluno.isMembro,
                membroId: aluno.membroId as string,
            });
        };
        const getVisita = async () => {
            const visitaDoc = doc(db, "visitantes", alunoId);
            const visitaSnap = await getDoc(visitaDoc);

            if (!visitaSnap.exists()) return;

            const visita = {
                id: visitaSnap.id,
                ...visitaSnap.data(),
            } as VisitanteInterface;

            reset({
                data_nascimento: visita.data_nascimento
                    ? visita.data_nascimento
                          .toDate()
                          .toISOString()
                          .split("T")[0]
                    : "",
                nome_completo: visita.nome_completo,
                contato: visita.contato || "",
            });
        };
        if (alunoId) {
            if (type === "aluno") getAluno();
            else getVisita();
        } else
            reset({
                nome_completo: "",
                data_nascimento: "",
                contato: "",
            });
    }, [alunoId, reset]);
    useEffect(() => {
        const getMembros = async (igrejaId: string) => {
            const membrosCll = collection(db, "membros");
            const q = query(
                membrosCll,
                where("igrejaId", "==", igrejaId),
                where("alunoId", "==", null)
            );
            const membroSnap = await getDocs(q);

            if (membroSnap.empty) return [];

            const m = membroSnap.docs.map(
                (v) =>
                    ({
                        id: v.id,
                        ...v.data(),
                        nome: v.data()?.nome_completo,
                    } as MembroInterface & { nome: string })
            );
            return m;
        };
        if (isMembro)
            getMembros(igrejaId)
                .then((v) => setMembros(v))
                .catch((err) => console.log("deu esse erro", err));
        else setCurrentMembro(null);
    }, [isMembro]);
    useEffect(() => {
        if (membros.length && currentMembro)
            reset({
                nome_completo: currentMembro.nome_completo,
                data_nascimento: currentMembro.data_nascimento
                    .toDate()
                    .toISOString()
                    .split("T")[0],
                isMembro: true,
                membroId: currentMembro.id,
                contato: currentMembro.contato || undefined,
            });
    }, [currentMembro]);

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
                            <FontAwesomeIcon icon={faUserPlus} />
                            {type === "aluno" ? (
                                <h2>
                                    {alunoId
                                        ? "Editar Aluno"
                                        : "Cadastrar Novo Aluno"}
                                </h2>
                            ) : (
                                <h2>Cadastrar Visita</h2>
                            )}
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
                                {type === "aluno" && (
                                    <motion.div
                                        variants={variantsItem}
                                        className="cadastro-aluno__form-item"
                                    >
                                        <div className="cadastro-aluno__input cadastro-aluno__input--membro">
                                            <span>Este aluno é um membro?</span>
                                            <label htmlFor="cadastro-aluno-is-membro">
                                                Este aluno é um membro?
                                            </label>

                                            <input
                                                type="checkbox"
                                                id="cadastro-aluno-is-membro"
                                                {...register("isMembro")}
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                {isMembro && (
                                    <motion.div
                                        variants={variantsItem}
                                        className="cadastro-aluno__form-item"
                                    >
                                        <div className="cadastro-aluno__input">
                                            <label htmlFor="">Membro*</label>

                                            <Controller
                                                control={control}
                                                name="membroId"
                                                rules={{
                                                    required:
                                                        "É necessário escolher o membro",
                                                }}
                                                render={({ field }) => (
                                                    <Dropdown
                                                        current={
                                                            membros.find(
                                                                (v) =>
                                                                    v.id ===
                                                                    field.value
                                                            )?.nome_completo ||
                                                            null
                                                        }
                                                        lista={membros}
                                                        isAll={false}
                                                        isErro={
                                                            !!errors.membroId
                                                        }
                                                        onSelect={(v) => {
                                                            setCurrentMembro(v);
                                                            field.onChange(
                                                                v?.id
                                                            );
                                                        }}
                                                    />
                                                )}
                                            />
                                        </div>

                                        <AnimatePresence>
                                            {errors.membroId && (
                                                <motion.div
                                                    variants={variantsErro}
                                                    initial="initial"
                                                    animate="animate"
                                                    exit="exit"
                                                    className="cadastro-aluno__input-erro"
                                                >
                                                    <p>
                                                        {
                                                            errors.membroId
                                                                .message
                                                        }
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                )}

                                <motion.div
                                    variants={variantsItem}
                                    className="cadastro-aluno__form-item"
                                >
                                    <div className="cadastro-aluno__input">
                                        <label htmlFor="cadastro-aluno-nome">
                                            Nome Completo*
                                        </label>
                                        <input
                                            type="text"
                                            disabled={isMembro}
                                            id="cadastro-aluno-nome"
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

                                    <AnimatePresence>
                                        {errors.nome_completo && (
                                            <motion.div
                                                variants={variantsErro}
                                                initial="initial"
                                                animate="animate"
                                                exit="exit"
                                                className="cadastro-aluno__input-erro"
                                            >
                                                <p>
                                                    {
                                                        errors.nome_completo
                                                            .message
                                                    }
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>

                                <div className="cadastro-aluno__form-group">
                                    <motion.div
                                        variants={variantsItem}
                                        className="cadastro-aluno__form-item"
                                    >
                                        <div className="cadastro-aluno__input">
                                            <label htmlFor="cadastro-aluno-data-nascimento">
                                                Data Nascimento*
                                            </label>
                                            <input
                                                type="date"
                                                disabled={isMembro}
                                                id="cadastro-aluno-data-nascimento"
                                                max={
                                                    new Date()
                                                        .toISOString()
                                                        .split("T")[0]
                                                }
                                                {...register(
                                                    "data_nascimento",
                                                    {
                                                        required:
                                                            type === "aluno"
                                                                ? "A data é obrigatória"
                                                                : false,
                                                    }
                                                )}
                                                className={
                                                    errors.data_nascimento
                                                        ? "input-error"
                                                        : ""
                                                }
                                            />
                                        </div>
                                        <AnimatePresence>
                                            {errors.data_nascimento && (
                                                <motion.div
                                                    variants={variantsErro}
                                                    initial="initial"
                                                    animate="animate"
                                                    exit="exit"
                                                    className="cadastro-aluno__input-erro"
                                                >
                                                    <p>
                                                        {
                                                            errors
                                                                .data_nascimento
                                                                .message
                                                        }
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>

                                    <motion.div
                                        variants={variantsItem}
                                        className="cadastro-aluno__form-item"
                                    >
                                        <div className="cadastro-aluno__input">
                                            <label htmlFor="cadastro-aluno-contato">
                                                Contato
                                            </label>
                                            <input
                                                type="text"
                                                disabled={isMembro}
                                                id="cadastro-aluno-contato"
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
                                        <AnimatePresence>
                                            {errors.contato && (
                                                <motion.div
                                                    variants={variantsErro}
                                                    initial="initial"
                                                    animate="animate"
                                                    exit="exit"
                                                    className="cadastro-aluno__input-erro"
                                                >
                                                    <p>
                                                        {errors.contato.message}
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
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
                                    {type === "aluno" ? (
                                        <button
                                            type="submit"
                                            className="button-primary"
                                            disabled={isEnviando}
                                        >
                                            {alunoId
                                                ? "Editar Aluno"
                                                : "Salvar Aluno"}
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            className="button-primary"
                                            disabled={isEnviando}
                                        >
                                            Adicionar Visita
                                        </button>
                                    )}
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

export default CadastroAlunoModal;
