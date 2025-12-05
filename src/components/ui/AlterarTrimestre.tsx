import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import "./cadastro-aluno-modal.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCalendar,
    faChevronDown,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FormProvider, useForm, type FieldError } from "react-hook-form";
import { useEffect, useState } from "react";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
} from "firebase/firestore";
import { db } from "../../utils/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import LoadingModal from "../layout/loading/LoadingModal";
import AlertModal from "./AlertModal";
import type { TrimestresInterface } from "../../interfaces/TrimestresInterface";
import "./alterar-trimestre.scss";
import type { LicaoInterface } from "../../interfaces/LicaoInterface";
import { useNavigate } from "react-router-dom";

interface Trimestre {
    data_inicio: string;
    numero_aulas: number;
    numero_trimestre: number;
}

const functions = getFunctions();
const atualizarTrimestre = httpsCallable(functions, "atualizarTrimestre");

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

const ErroComponent = ({ field }: { field?: FieldError }) => {
    return (
        <AnimatePresence>
            {field && (
                <motion.span
                    key={field.message}
                    variants={variantsErro}
                    initial="initial"
                    animate="animate"
                    exit={"exit"}
                    className="novo-trimestre__input--erro"
                >
                    {field.message}
                </motion.span>
            )}
        </AnimatePresence>
    );
};

function AlterarTrimestre({
    onCancel,
    onSave,
    trimestreId,
}: {
    onCancel: () => void;
    onSave: () => void;
    trimestreId: string;
}) {
    const methods = useForm<Trimestre>();
    const {
        register,
        reset,
        handleSubmit,
        watch,
        formState: { errors },
    } = methods;
    const [isEnviando, setIsEnviando] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [mensagemErro, setMensagemErro] = useState("");
    const [dataAulas, setDataAulas] = useState<string[][]>([]);
    const [licoes, setLicoes] = useState<LicaoInterface[]>([]);
    const [isOpenAulas, setIsOpenAulas] = useState(false);
    const [isOpenLicoes, setIsOpenLicoes] = useState(false);
    const { data_inicio, numero_aulas } = watch();

    const navigate = useNavigate();

    const onSubmit = async (dados: Trimestre) => {
        setIsEnviando(true);

        try {
            await atualizarTrimestre({ trimestreId, dados });
            onSave();
            onCancel();
        } catch (error: any) {
            setMensagemErro(error.message);
        } finally {
            setIsEnviando(false);
        }
    };

    useEffect(() => {
        if (data_inicio && numero_aulas > 0) {
            const data = new Date(data_inicio + "T12:00:00");

            if (data.getUTCDay() !== 0) return setDataAulas([]);

            const listaDatas: string[][] = Array.from({
                length: numero_aulas,
            }).map((_, i) => {
                const dataAula = new Date(data);
                dataAula.setUTCDate(dataAula.getUTCDate() + i * 7);
                return [
                    "Aula " + (i + 1),
                    dataAula.toLocaleDateString("pt-BR"),
                ];
            });

            setDataAulas(listaDatas);
        }
    }, [data_inicio, numero_aulas]);
    useEffect(() => {
        const getTrimestre = async () => {
            const trimestresDoc = doc(db, "trimestres", trimestreId);
            const trimestresSnap = await getDoc(trimestresDoc);

            if (!trimestresSnap.exists()) return;

            const trimestre = {
                id: trimestresSnap.id,
                ...trimestresSnap.data(),
            } as TrimestresInterface;

            const numero_aulas =
                (trimestre.data_fim.toDate().getTime() -
                    trimestre.data_inicio.toDate().getTime()) /
                    (1000 * 60 * 60 * 24) /
                    7 +
                1;

            reset({
                data_inicio: trimestre.data_inicio
                    .toDate()
                    .toISOString()
                    .split("T")[0],
                numero_trimestre: trimestre.numero_trimestre,
                numero_aulas,
            });

            const dataInicio = trimestre.data_inicio.toDate();
            dataInicio.setHours(0, 0, 0, 0);
            const dataFim = trimestre.data_fim.toDate();
            dataFim.setHours(23, 59, 59, 59);

            const licoesSnap = collection(db, "licoes");
            const q = query(
                licoesSnap,
                where("data_inicio", ">=", dataInicio),
                where("data_fim", "<=", dataFim),
                where("numero_trimestre", "==", trimestre.numero_trimestre),
                where("ministerioId", "==", trimestre.ministerioId)
            );
            const licoesDocs = await getDocs(q);

            const licoes = licoesDocs.docs.map(
                (v) =>
                    ({
                        id: v.id,
                        ...v.data(),
                    } as LicaoInterface)
            );

            setLicoes(licoes);
        };

        getTrimestre().finally(() => setIsLoading(false));
    }, []);
    return (
        <>
            <motion.div
                className="cadastro-aluno-overlay"
                onClick={!isEnviando ? onCancel : undefined}
                exit={{ scale: 0, transition: { duration: 0.2 } }}
            >
                <motion.div
                    variants={variantsForm}
                    initial="initial"
                    animate="animate"
                    exit={"initial"}
                    className="alterar-trimestre"
                    onClick={(e) => e.stopPropagation()}
                >
                    <LoadingModal
                        isEnviando={isEnviando || isLoading}
                        mensagem={isLoading ? "Carregando" : "Enviando"}
                    />
                    <div className="cadastro-aluno__header">
                        <div className="cadastro-aluno__title">
                            <FontAwesomeIcon icon={faCalendar} />
                            <h2>Atualizar Trimestre</h2>
                        </div>
                        <button
                            className="cadastro-aluno__close"
                            onClick={onCancel}
                        >
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>

                    <div className="novo-trimestre__body">
                        <FormProvider {...methods}>
                            <form
                                className="novo-trimestre__form"
                                onSubmit={handleSubmit(onSubmit)}
                            >
                                <div className="novo-trimestre__input-group">
                                    <div className="novo-trimestre__input">
                                        <label htmlFor="data_inicio">
                                            Data de Início
                                        </label>
                                        <input
                                            type="date"
                                            id="data_inicio"
                                            className={
                                                errors.data_inicio
                                                    ? "input-error"
                                                    : ""
                                            }
                                            {...register("data_inicio", {
                                                required:
                                                    "A data de início é obrigatória.",
                                                validate: (value) => {
                                                    if (!value) return true;
                                                    const dia = new Date(
                                                        value
                                                    ).getUTCDay();
                                                    return (
                                                        dia === 0 ||
                                                        "A data de início precisa ser um domingo!"
                                                    );
                                                },
                                            })}
                                        />
                                        <ErroComponent
                                            field={errors.data_inicio}
                                        />
                                    </div>
                                    <div className="novo-trimestre__input">
                                        <label htmlFor="novo-trimestre-trimestre">
                                            Nº do Trimestre
                                        </label>
                                        <input
                                            type="number"
                                            step={1}
                                            id="novo-trimestre-trimestre"
                                            className={
                                                errors.numero_trimestre
                                                    ? "input-error"
                                                    : ""
                                            }
                                            {...register("numero_trimestre", {
                                                required:
                                                    "O Nº do trimestre é obrigatório.",
                                                min: {
                                                    value: 1,
                                                    message:
                                                        "Número do trimestre está inválido",
                                                },
                                                max: {
                                                    value: 4,
                                                    message:
                                                        "Número do trimestre está inválido",
                                                },
                                                valueAsNumber: true,
                                            })}
                                        />
                                        <ErroComponent
                                            field={errors.numero_trimestre}
                                        />
                                    </div>
                                </div>
                                <div className="novo-trimestre__input">
                                    <label htmlFor="numero_aulas">
                                        Quantidade de Aulas
                                    </label>
                                    <input
                                        type="number"
                                        id="numero_aulas"
                                        className={
                                            errors.numero_aulas
                                                ? "input-error"
                                                : ""
                                        }
                                        {...register("numero_aulas", {
                                            required:
                                                "A quantidade de aulas é obrigatória",
                                            valueAsNumber: true,
                                            min: {
                                                value: 1,
                                                message: "O valor mínimo é 1",
                                            },
                                        })}
                                    />
                                    <ErroComponent
                                        field={errors.numero_aulas}
                                    />
                                </div>
                                <AnimatePresence>
                                    {dataAulas.length && (
                                        <motion.div
                                            initial={{
                                                opacity: 0,
                                            }}
                                            animate={{
                                                opacity: 1,
                                            }}
                                            exit={{ opacity: 0 }}
                                            onTap={() =>
                                                setIsOpenAulas((v) => !v)
                                            }
                                            className={`alterar-trimestre__licoes ${
                                                isOpenAulas ? "is-open" : ""
                                            }`}
                                            key={"previsao-aulas"}
                                        >
                                            <h3>
                                                Lista de aulas{" "}
                                                <span>
                                                    <FontAwesomeIcon
                                                        icon={faChevronDown}
                                                    />
                                                </span>
                                            </h3>
                                            <AnimatePresence>
                                                {isOpenAulas && (
                                                    <motion.ul
                                                        key={
                                                            "previsao-aulas-container"
                                                        }
                                                        initial={{
                                                            y: -10,
                                                            height: 0,
                                                        }}
                                                        animate={{
                                                            y: 0,
                                                            height: "auto",
                                                        }}
                                                        exit={{
                                                            y: -10,
                                                            height: 0,
                                                        }}
                                                        className="novo-trimestre__previsao-aulas--lista"
                                                    >
                                                        {dataAulas.map(
                                                            ([aula, data]) => (
                                                                <motion.li
                                                                    key={
                                                                        aula +
                                                                        data
                                                                    }
                                                                >
                                                                    <p>
                                                                        {aula}
                                                                    </p>
                                                                    <data
                                                                        value={
                                                                            data
                                                                        }
                                                                    >
                                                                        {data}
                                                                    </data>
                                                                </motion.li>
                                                            )
                                                        )}
                                                    </motion.ul>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <AnimatePresence>
                                    {licoes.length ? (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onTap={() =>
                                                setIsOpenLicoes((v) => !v)
                                            }
                                            className={`alterar-trimestre__licoes ${
                                                isOpenLicoes ? "is-open" : ""
                                            }`}
                                            key={"licoes-aulas"}
                                        >
                                            <h3>
                                                Lições
                                                <span>
                                                    <FontAwesomeIcon
                                                        icon={faChevronDown}
                                                    />
                                                </span>
                                            </h3>
                                            <AnimatePresence>
                                                {isOpenLicoes && (
                                                    <motion.ul
                                                        key={"lista-licoes"}
                                                        initial={{
                                                            y: -10,
                                                            height: 0,
                                                            padding: 0,
                                                        }}
                                                        animate={{
                                                            y: 0,
                                                            height: "auto",
                                                            padding: "1.5rem",
                                                        }}
                                                        exit={{
                                                            y: -10,
                                                            height: 0,
                                                            padding: 0,
                                                        }}
                                                        className="alterar-trimestre__licoes-lista"
                                                    >
                                                        {licoes.map((v) => (
                                                            <motion.li
                                                                key={v.id}
                                                            >
                                                                <div className="alterar-trimestre__licoes-lista__infos">
                                                                    <p className="alterar-trimestre__licoes-lista__info">
                                                                        {
                                                                            v.igrejaNome
                                                                        }
                                                                    </p>
                                                                    <p className="alterar-trimestre__licoes-lista__info">
                                                                        {
                                                                            v.classeNome
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <motion.button
                                                                    type="button"
                                                                    onTap={() =>
                                                                        navigate(
                                                                            `/aulas/igreja/${v.igrejaId}/classe/${v.classeId}`
                                                                        )
                                                                    }
                                                                >
                                                                    Ir para
                                                                    lição
                                                                </motion.button>
                                                            </motion.li>
                                                        ))}
                                                    </motion.ul>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    ) : (
                                        <div className="alterar-trimestre__licoes">
                                            <p className="alterar-trimestre__licoes--vazio">
                                                Não existem lições registradas
                                                com essa data
                                            </p>
                                        </div>
                                    )}
                                </AnimatePresence>

                                <motion.div
                                    variants={variantsItem}
                                    className="novo-trimestre__actions"
                                >
                                    <button
                                        type="button"
                                        className="button-secondary"
                                        disabled={isEnviando}
                                        onClick={onCancel}
                                    >
                                        Cancelar
                                    </button>

                                    {licoes.length ? (
                                        <button
                                            type="submit"
                                            className="button-primary"
                                            disabled={isEnviando}
                                        >
                                            Atualizar Trimestre
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            className="button-delete"
                                            disabled={isEnviando}
                                        >
                                            Deletar Trimestre
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

export default AlterarTrimestre;
