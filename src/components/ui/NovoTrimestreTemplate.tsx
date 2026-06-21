import { AnimatePresence, motion } from "framer-motion";
import { memo, useEffect, useState, type ReactNode } from "react";
import LoadingModal from "../layout/loading/LoadingModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faSquarePen, faXmark } from "@fortawesome/free-solid-svg-icons";
import "./novo-trimestre-modal.scss";
import {
    useFormContext,
    useWatch,
    type Control,
    type FieldError,
    type FieldErrorsImpl,
    type FieldValues,
    type Merge,
    type UseFormRegister,
    type UseFormSetValue,
} from "react-hook-form";
import getTrimestre from "../../utils/getTrimestre";

interface BaseTrimestreInput {
    register: UseFormRegister<any>;
    nameKey?: string;
    error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>>;
}
interface TrimestreInputData extends BaseTrimestreInput {
    setValue: UseFormSetValue<any>;
    nameTrimestre?: string;
}
interface TrimestreBaseInputsProps {
    nameTrimestre?: string;
    nameTitle?: string;
    nameData?: string;
    nameAulas?: string;
}

export const ListaDeAulas = memo(
    ({ control, nameAulas, nameData }: { control: Control<any>; nameData: string; nameAulas: string }) => {
        const [showAulas, setShowAulas] = useState(false);
        const [dataAulas, setDataAulas] = useState<string[][]>([]);
        const dataInicio = useWatch({ control, name: nameData });
        const numeroAulas = useWatch({ control, name: nameAulas });

        useEffect(() => {
            if (dataInicio && numeroAulas > 0) {
                const data = new Date(dataInicio + "T12:00:00");

                if (data.getUTCDay() !== 0) return setDataAulas([]);

                const listaDatas: string[][] = Array.from({
                    length: numeroAulas,
                }).map((_, i) => {
                    const dataAula = new Date(data);
                    dataAula.setUTCDate(dataAula.getUTCDate() + i * 7);
                    return ["Aula " + (i + 1), dataAula.toLocaleDateString("pt-BR")];
                });

                setDataAulas(listaDatas);
            }
        }, [dataInicio, numeroAulas]);
        return (
            <AnimatePresence>
                {dataAulas.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        onTap={() => setShowAulas((v) => !v)}
                        key={"previsao-aulas"}
                        style={{ flexShrink: 0 }}
                    >
                        <div className={`novo-trimestre__previsao-aulas ${showAulas ? "is-open" : ""}`}>
                            <h3>
                                Lista de aulas{" "}
                                <span>
                                    <FontAwesomeIcon icon={faChevronDown} />
                                </span>
                            </h3>
                            <AnimatePresence>
                                {showAulas && (
                                    <motion.div
                                        key={"previsao-aulas-container"}
                                        initial={{ y: -10, height: 0 }}
                                        animate={{ y: 0, height: "auto" }}
                                        exit={{ y: -10, height: 0 }}
                                    >
                                        <ul className="novo-trimestre__previsao-aulas--lista">
                                            {dataAulas.map(([aula, data]) => (
                                                <li key={aula + data}>
                                                    <p>{aula}</p>
                                                    <data value={data}>{data}</data>
                                                </li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    },
);

const NovoTrimestreErrorComponent = ({ field }: { field?: FieldError | Merge<FieldError, FieldErrorsImpl<any>> }) => {
    return (
        <AnimatePresence>
            {field && (
                <motion.span key={(field as any).message} className="novo-trimestre__input--erro">
                    {(field as any).message}
                </motion.span>
            )}
        </AnimatePresence>
    );
};

export const NovoTrimestreTitle = memo(({ register, error, nameKey = "titulo" }: BaseTrimestreInput) => {
    return (
        <div className="novo-trimestre__input">
            <label htmlFor={`novo-trimestre-${nameKey}`}>Titulo da lição</label>
            <input
                type="text"
                id={`novo-trimestre-${nameKey}`}
                className={error ? "input-error" : ""}
                {...register(nameKey, {
                    required: "O título da lição é obrigatório",
                })}
            />
            <NovoTrimestreErrorComponent field={error} />
        </div>
    );
});
export const NovoTrimestreData = memo(
    ({ error, register, setValue, nameTrimestre = "trimestre", nameKey = "data_inicio" }: TrimestreInputData) => {
        return (
            <div className="novo-trimestre__input">
                <label htmlFor={`novo-trimestre-${nameKey}`}>Data de Início</label>
                <input
                    type="date"
                    id={`novo-trimestre-${nameKey}`}
                    className={error ? "input-error" : ""}
                    {...register(nameKey, {
                        required: "A data de início é obrigatória.",
                        validate: (value) => {
                            if (!value) return true;
                            const dia = new Date(value).getUTCDay();
                            return dia === 0 || "A data de início precisa ser um domingo!";
                        },
                        onChange: (e) => {
                            const d = e.currentTarget.value;
                            const data = new Date(d + "T12:00:00");
                            if (data) setValue(nameTrimestre, getTrimestre(data));
                        },
                    })}
                />
                <NovoTrimestreErrorComponent field={error} />
            </div>
        );
    },
);
export const NovoTrimestreTrimestre = memo(({ register, error, nameKey = "trimestre" }: BaseTrimestreInput) => {
    return (
        <div className="novo-trimestre__input">
            <label htmlFor={`novo-trimestre-${nameKey}`}>Nº do Trimestre</label>
            <input
                type="number"
                step={1}
                id={`novo-trimestre-${nameKey}`}
                className={error ? "input-error" : ""}
                {...register(nameKey, {
                    required: "O Nº do trimestre é obrigatório.",
                    min: {
                        value: 1,
                        message: "Número do trimestre está inválido",
                    },
                    max: {
                        value: 4,
                        message: "Número do trimestre está inválido",
                    },
                    valueAsNumber: true,
                })}
            />
            <NovoTrimestreErrorComponent field={error} />
        </div>
    );
});
export const NovoTrimestreNAulas = memo(({ register, error, nameKey = "numero_aulas" }: BaseTrimestreInput) => {
    return (
        <div className="novo-trimestre__input">
            <label htmlFor={`novo-trimestre-${nameKey}`}>Quantidade de Aulas</label>
            <input
                type="number"
                id={`novo-trimestre-${nameKey}`}
                className={error ? "input-error" : ""}
                {...register(nameKey, {
                    required: "A quantidade de aulas é obrigatória",
                    valueAsNumber: true,
                    min: {
                        value: 1,
                        message: "O valor mínimo é 1",
                    },
                })}
            />
            <NovoTrimestreErrorComponent field={error} />
        </div>
    );
});

export const NovoTrimestreBaseInputs = <T extends FieldValues>({
    nameAulas = "numero_aulas",
    nameData = "data_inicio",
    nameTitle = "titulo",
    nameTrimestre = "trimestre",
}: TrimestreBaseInputsProps) => {
    const {
        formState: { errors },
        register,
        setValue,
    } = useFormContext<T>();
    return (
        <>
            <div className="novo-trimestre__input-group">
                <NovoTrimestreTitle error={errors[nameTitle]} register={register} nameKey={nameTitle} />

                <NovoTrimestreData
                    register={register}
                    setValue={setValue}
                    error={errors[nameData]}
                    nameKey={nameData}
                    nameTrimestre={nameTrimestre}
                />
            </div>

            <div className="novo-trimestre__input-group">
                <NovoTrimestreTrimestre register={register} error={errors[nameTrimestre]} nameKey={nameTrimestre} />
                <NovoTrimestreNAulas register={register} error={errors[nameAulas]} nameKey={nameAulas} />
            </div>
        </>
    );
};

function NovoTrimestreTemplate({
    children,
    isEnviando,
    isLoading,
    isEdit,
    title,
}: {
    children: ReactNode;
    isEnviando: boolean;
    isLoading: boolean;
    isEdit: boolean;
    title: string;
}) {
    return (
        <motion.div
            className="novo-trimestre-close"
            onClick={() => (!isEnviando ? window.history.back() : null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="novo-trimestre"
                style={{ minHeight: "auto" }}
                initial={{ y: 0 }}
                exit={{ y: 50 }}
                onClick={(e) => e.stopPropagation()}
            >
                <>
                    <LoadingModal isEnviando={isLoading || isEnviando} />
                    <div className="novo-trimestre__header">
                        <div className="novo-trimestre__header--title-group">
                            <div className="novo-trimestre__header--title">
                                <h2>{title}</h2>
                            </div>
                        </div>

                        <div className="novo-trimestre__header--close" onClick={() => window.history.back()}>
                            <FontAwesomeIcon icon={faXmark} />
                        </div>

                        {isEdit ? (
                            <div className="novo-trimestre__header--aviso">
                                <FontAwesomeIcon icon={faSquarePen} />
                                <span>Atenção: você está editando</span>
                            </div>
                        ) : (
                            <></>
                        )}
                    </div>
                    <div className="novo-trimestre__body">{children}</div>
                </>
            </motion.div>
        </motion.div>
    );
}

export default NovoTrimestreTemplate;
