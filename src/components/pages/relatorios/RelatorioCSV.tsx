import { useEffect, useMemo, useState } from "react";
import Dropdown from "../../ui/Dropdown";
import "./relatorio-csv.scss";
import MultiSelectDropdown from "../../ui/MultiSelectDropdown";
import { useAuthContext } from "../../../context/AuthContext";
import { useDataContext } from "../../../context/DataContext";
import Loading from "../../layout/loading/Loading";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFaceSmileBeam,
    faFileCsv,
    faTable,
} from "@fortawesome/free-solid-svg-icons";
import { getFunctions, httpsCallable } from "firebase/functions";

function baixarArquivoCSV(csvString: string, nomeArquivo: string) {
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", nomeArquivo);

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

interface Form {
    data_inicio: string;
    data_fim: string;
    igrejas?: string[];
    classes?: string[];
    type: "previa" | "csv";
}

const variantsForm: Variants = {
    hidden: {},
    visible: { transition: { delayChildren: stagger(0.1) } },
    exit: { y: -10, transition: { delayChildren: stagger(0.1) } },
};

const variantsItem: Variants = {
    hidden: { opacity: 0, y: -15 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
};

const functions = getFunctions();
const exportarDadosCSV = httpsCallable(functions, "exportarDadosCSV");

function RelatorioCSV() {
    const TIPOS = [
        { nome: "Relatórios de Aulas", id: "registros_aula" },
        { nome: "Lista de Membros", id: "membros" },
        { nome: "Lista de Alunos", id: "alunos" },
        { nome: "Histórico de Matrículas", id: "matriculas" },
        { nome: "Lista de Usuários", id: "usuarios" },
        { nome: "Licoes Cadastradas", id: "licoes" },
        { nome: "Lista Chamada", id: "chamada" },
    ];
    const [current, setCurrent] = useState<string | null>(null);
    const [tipos, setTipos] = useState(TIPOS);
    const [previaLinhas, setPreviaLinhas] = useState<any[] | null>(null);
    const [previaColunas, setPreviaColunas] = useState<string[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { isSecretario, isSuperAdmin, user } = useAuthContext();
    const { classes, igrejas, isLoadingData } = useDataContext();
    const methods = useForm<Form>();
    const {
        register,
        handleSubmit,
        setValue,
        control,
        watch,
        formState: { errors },
    } = methods;
    const idsIgrejas = watch("igrejas");

    const onSubmit = (v: Form) => {
        setIsLoading(true);
        setPreviaColunas(null);
        setPreviaLinhas(null);
        exportarDadosCSV({ ...v, colecao: current })
            .then(({ data }) => {
                const dados = data as any;

                if (v.type === "previa") {
                    if (!dados?.length) {
                        setPreviaColunas([]);
                        setPreviaLinhas([]);
                        return;
                    }
                    const colunas = Object.keys(dados[0]);
                    setPreviaColunas(colunas);
                    setPreviaLinhas(dados);
                } else {
                    baixarArquivoCSV(dados, `relatorio_${current}.csv`);
                }
            })
            .catch((err) => console.log("deu esse erro", err))
            .finally(() => setIsLoading(false));
    };

    const classesMemo = useMemo(() => {
        return classes.filter((v) => idsIgrejas?.includes(v.igrejaId));
    }, [idsIgrejas]);
    useEffect(() => {
        if (user) {
            if (!isSuperAdmin.current) setValue("igrejas", [user!.igrejaId!]);
            if (isSecretario.current) {
                setValue("classes", [user.classeId!]);
                setTipos(TIPOS.filter((v) => v.id !== "membros"));
            }
        }
    }, [user]);

    if (isLoadingData) return <Loading />;
    return (
        <div className="relatorio-csv">
            <div className="relatorio-csv__header">
                <div className="relatorio-csv__title">
                    <h2>Relatórios CSV</h2>
                </div>

                <div className="relatorio-csv__filtros">
                    <div className="relatorio-csv__input-central">
                        <p className="relatorio-csv__input--title">
                            Qual relatório você deseja exportar?
                        </p>
                        <Dropdown
                            lista={tipos}
                            current={
                                tipos.find((v) => v.id === current)?.nome ||
                                null
                            }
                            onSelect={(v) => setCurrent(v?.id || null)}
                            isAll={false}
                            selectId={current || ""}
                        />
                    </div>

                    <FormProvider {...methods}>
                        <AnimatePresence>
                            {current && (
                                <motion.form
                                    key={"relatorio-csv-form"}
                                    className="relatorio-csv__filtros-form"
                                    variants={variantsForm}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    onSubmit={handleSubmit(onSubmit)}
                                >
                                    {current !== "alunos" &&
                                        current !== "usuarios" &&
                                        current !== "membros" && (
                                            <div className="relatorio-csv__input-group">
                                                <AnimatePresence>
                                                    <motion.div
                                                        variants={variantsItem}
                                                        key={
                                                            "relatorio-csv-data-inicio"
                                                        }
                                                        className="relatorio-csv__input"
                                                    >
                                                        <label
                                                            htmlFor="relatorio-csv-data-inicio"
                                                            className="relatorio-csv__input--title"
                                                        >
                                                            Data Inicio
                                                        </label>
                                                        <input
                                                            type="date"
                                                            id="relatorio-csv-data-inicio"
                                                            className={
                                                                errors.data_inicio &&
                                                                "input-error"
                                                            }
                                                            {...register(
                                                                "data_inicio",
                                                                {
                                                                    required:
                                                                        "A data de início é obrigatória",
                                                                }
                                                            )}
                                                        />

                                                        {errors.data_inicio && (
                                                            <motion.div className="relatorio-csv__input--erro">
                                                                <p>
                                                                    {
                                                                        errors
                                                                            .data_inicio
                                                                            .message
                                                                    }
                                                                </p>
                                                            </motion.div>
                                                        )}
                                                    </motion.div>
                                                </AnimatePresence>

                                                <AnimatePresence>
                                                    <motion.div
                                                        variants={variantsItem}
                                                        key={
                                                            "relatorio-csv-data-fim"
                                                        }
                                                        className="relatorio-csv__input"
                                                    >
                                                        <label
                                                            htmlFor="relatorio-csv-data-fim"
                                                            className="relatorio-csv__input--title"
                                                        >
                                                            Data Fim
                                                        </label>
                                                        <input
                                                            type="date"
                                                            className={
                                                                errors.data_fim &&
                                                                "input-error"
                                                            }
                                                            id="relatorio-csv-data-fim"
                                                            {...register(
                                                                "data_fim",
                                                                {
                                                                    required:
                                                                        "A data de fim é obrigatória",
                                                                }
                                                            )}
                                                        />
                                                        {errors.data_fim && (
                                                            <motion.div className="relatorio-csv__input--erro">
                                                                <p>
                                                                    {
                                                                        errors
                                                                            .data_fim
                                                                            .message
                                                                    }
                                                                </p>
                                                            </motion.div>
                                                        )}
                                                    </motion.div>
                                                </AnimatePresence>
                                            </div>
                                        )}

                                    <div className="relatorio-csv__input-group">
                                        {isSuperAdmin.current && (
                                            <motion.div
                                                variants={variantsItem}
                                                key="relatorio-csv-igrejas"
                                                className="relatorio-csv__input"
                                            >
                                                <p className="relatorio-csv__input--title">
                                                    Igrejas
                                                </p>
                                                <Controller
                                                    control={control}
                                                    name="igrejas"
                                                    render={({ field }) => (
                                                        <MultiSelectDropdown
                                                            lista={igrejas}
                                                            currentListIds={
                                                                field.value ||
                                                                []
                                                            }
                                                            onChange={(v) => {
                                                                field.onChange(
                                                                    v
                                                                );
                                                                setValue(
                                                                    "classes",
                                                                    []
                                                                );
                                                            }}
                                                            texto="Todas as igrejas"
                                                        />
                                                    )}
                                                />
                                            </motion.div>
                                        )}

                                        {!isSecretario.current &&
                                            current !== "alunos" &&
                                            current !== "membros" && (
                                                <motion.div
                                                    variants={variantsItem}
                                                    key="relatorio-csv-classes"
                                                    className="relatorio-csv__input"
                                                >
                                                    <p className="relatorio-csv__input--title">
                                                        classes
                                                    </p>
                                                    <Controller
                                                        control={control}
                                                        name="classes"
                                                        render={({ field }) => (
                                                            <MultiSelectDropdown
                                                                lista={
                                                                    classesMemo
                                                                }
                                                                currentListIds={
                                                                    field.value ||
                                                                    []
                                                                }
                                                                onChange={(v) =>
                                                                    field.onChange(
                                                                        v
                                                                    )
                                                                }
                                                                texto="Todas as classes"
                                                            />
                                                        )}
                                                    />
                                                </motion.div>
                                            )}
                                    </div>

                                    <motion.div
                                        variants={variantsItem}
                                        className="relatorio-csv__buttons"
                                    >
                                        <div className="relatorios-graficos__csv">
                                            <button
                                                title="Ver Prévia"
                                                type="submit"
                                                onClick={() =>
                                                    setValue("type", "previa")
                                                }
                                            >
                                                <span>
                                                    <FontAwesomeIcon
                                                        icon={faTable}
                                                    />
                                                </span>
                                                Ver Prévia
                                            </button>
                                        </div>
                                        <div className="relatorio-csv__button relatorio-csv__button--csv">
                                            <button
                                                title="Gerar Arquivo CSV"
                                                type="submit"
                                                onClick={() =>
                                                    setValue("type", "csv")
                                                }
                                            >
                                                <span>
                                                    <FontAwesomeIcon
                                                        icon={faFileCsv}
                                                    />
                                                </span>
                                                Gerar Relatório
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </FormProvider>
                </div>
            </div>

            <div className="relatorio-csv__body">
                {isLoading ? (
                    <div className="table-skeleton">
                        <table>
                            <thead>
                                <tr>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ) : !!previaColunas && previaColunas.length > 0 ? (
                    <div className="relatorio-csv__table-container">
                        <table className="relatorio-csv__table">
                            <thead>
                                <tr>
                                    {previaColunas.map((v, i) => (
                                        <th key={i + "th"}>{v}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {previaLinhas!.map((v, i) => (
                                    <tr key={"tr" + i}>
                                        {previaColunas.map((c, ind) => (
                                            <td key={"td" + ind}>
                                                {v[c] || "-"}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    !!previaColunas && (
                        <div className="relatorio-csv__vazio">
                            <p>
                                Nenhum resultado encontrado. Faça uma nova
                                consulta!
                                <span>
                                    <FontAwesomeIcon icon={faFaceSmileBeam} />
                                </span>
                            </p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

export default RelatorioCSV;
