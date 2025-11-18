import { useEffect, useMemo, useState } from "react";
import MultiSelectDropdown from "../../ui/MultiSelectDropdown";
import "./relatorios-graficos.scss";
import {
    faChartArea,
    faChartLine,
    faChartPie,
    faChartSimple,
    faFaceSmileBeam,
    faUpRightAndDownLeftFromCenter,
} from "@fortawesome/free-solid-svg-icons";
import Dropdown from "../../ui/Dropdown";
import {
    Controller,
    FormProvider,
    useForm,
    type FieldError,
} from "react-hook-form";
import { useAuthContext } from "../../../context/AuthContext";
import { useDataContext } from "../../../context/DataContext";
import Loading from "../../layout/loading/Loading";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Form, useSearchParams } from "react-router-dom";
import GraficoDinamico from "../../ui/GraficoDinamico";
import { getFunctions, httpsCallable } from "firebase/functions";
import DashboardCardSkeleton from "../../ui/DashboardCardSkeleton";
import DashboardCardModal from "../../ui/DashboardCardModal";

const METRICAS = [
    { nome: "Ofertas (Detalhado)", id: "ofertas" }, //ok
    { nome: "Ofertas (Total Consolidado)", id: "ofertas_total" }, //ok
    { nome: "Missões (Detalhado)", id: "missoes" }, //ok
    { nome: "Missões (Total Consolidado)", id: "missoes_total" }, //ok
    { nome: "Total de Pessoas (Geral)", id: "total_presentes" }, // ok
    { nome: "Presentes (na chamada)", id: "presentes_chamada" },
    { nome: "Atrasados", id: "atrasados" },
    { nome: "Ausentes", id: "total_ausentes" },
    { nome: "Bíblias Trazidas", id: "biblias" },
    { nome: "Revistas Trazidas", id: "licoes_trazidas" },
    { nome: "Frequência de Alunos (%)", id: "frequencia_alunos" },
];

const AGRUPAMENTOS = [
    { nome: "Por Semana", id: "semana" },
    { nome: "Por Mês", id: "mes" },
    { nome: "Por Trimestre", id: "trimestre" },
    { nome: "Por Classe", id: "classe" },
    { nome: "Por Aluno", id: "aluno" },
    { nome: "Por Igreja", id: "igreja" },
];

const GRAFICOS = [
    { nome: "Barras", id: "bar", icon: faChartSimple },
    { nome: "Linhas ", id: "line", icon: faChartLine },
    { nome: "Pizza", id: "pie", icon: faChartPie },
];

interface Form {
    metrica: string;
    agrupamento: string;
    dataInicio: string;
    dataFim: string;
    igrejas?: string[];
    classes?: string[];
    grafico: "bar" | "line" | "pie";
}

const functions = getFunctions();
const gerarRelatorio = httpsCallable(functions, "gerarRelatorio");

const ErroComponent = ({ erro }: { erro: FieldError }) => {
    return (
        <motion.div className="relatorios-graficos__form-erro">
            {erro.message}
        </motion.div>
    );
};

function RelatoriosGraficos() {
    const [dados, setDados] = useState<
        {
            name: string;
            [key: string]: string;
        }[]
    >([]);
    const [title, setTitle] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [modal, setModal] = useState(false);
    const { isSuperAdmin, user, isAdmin, isSecretario } = useAuthContext();
    const { classes, igrejas, isLoadingData } = useDataContext();
    const [params, setParams] = useSearchParams();

    const methods = useForm<Form>();
    const {
        handleSubmit,
        register,
        control,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = methods;
    const dataInicio = watch("dataInicio");
    const tipoGrafico = watch("grafico");
    const metrica = watch("metrica");
    const igrejasIds = watch("igrejas");
    const onSave = (v: Form) => {
        setIsLoading(true);
        setParams(v as {});
        gerarRelatorio(v)
            .then(({ data }) => {
                setDados(data as any);
                setTitle(METRICAS.find((v) => v.id === metrica)?.nome || "");
                if (!tipoGrafico) setValue("grafico", "bar");
            })
            .catch((err) => console.log("deu esse erro", err))
            .finally(() => setIsLoading(false));
    };

    const agrupamentosMemo = useMemo(() => {
        let ag = AGRUPAMENTOS;
        if (!isSuperAdmin.current) ag = ag.filter((v) => v.id !== "igreja");
        if (isSecretario.current) ag = ag.filter((v) => v.id !== "classe");
        if (
            metrica === "ofertas_total" ||
            metrica === "missoes_total" ||
            metrica === "ofertas" ||
            metrica === "missoes"
        )
            ag = ag.filter((v) => v.id !== "aluno");
        if (metrica === "frequencia_alunos")
            ag = ag.filter(
                (v) =>
                    v.id === "classe" || v.id === "igreja" || v.id === "aluno"
            );

        return ag;
    }, [user, metrica]);
    const classesMemo = useMemo(() => {
        const c = classes.filter((v) => igrejasIds?.includes(v.igrejaId));
        return c;
    }, [igrejasIds, metrica]);
    useEffect(() => {
        const igs = params.getAll("igrejas");
        const classes = params.getAll("classes");

        const form = Object.fromEntries(params.entries());

        reset({
            ...form,
            grafico: tipoGrafico || form?.grafico || "bar",
            igrejas: !igs.includes("undefined") ? igs : undefined,
            classes: !classes.includes("undefined") ? classes : undefined,
        });
        if (isAdmin.current && igrejas.length)
            setValue("igrejas", [igrejas[0].id]);
    }, [params, igrejas]);

    if (isLoadingData) return <Loading />;
    return (
        <>
            <div className="relatorios-graficos">
                <div className="relatorios-graficos__header">
                    <div className="relatorios-graficos__title">
                        <h2>Relatórios Gráficos</h2>
                    </div>
                    <FormProvider {...methods}>
                        <form
                            className="relatorios-graficos__form"
                            onSubmit={handleSubmit(onSave)}
                        >
                            <div className="relatorios-graficos__filtros">
                                <div className="relatorios-graficos__group-filtro">
                                    {/* Métricas */}
                                    <div className="relatorios-graficos__filtro">
                                        <p>Métrica</p>
                                        <Controller
                                            name="metrica"
                                            control={control}
                                            rules={{
                                                required:
                                                    "A métrica é obrigatória",
                                            }}
                                            render={({ field }) => (
                                                <Dropdown
                                                    current={
                                                        METRICAS.find(
                                                            (v) =>
                                                                v.id ===
                                                                field.value
                                                        )?.nome || null
                                                    }
                                                    lista={METRICAS}
                                                    onSelect={(v) => {
                                                        field.onChange(
                                                            v?.id || null
                                                        );
                                                        setValue(
                                                            "agrupamento",
                                                            ""
                                                        );
                                                    }}
                                                    isAll={false}
                                                    isErro={!!errors.metrica}
                                                    selectId={field.value}
                                                />
                                            )}
                                        />
                                        {errors.metrica && (
                                            <ErroComponent
                                                erro={errors.metrica}
                                            />
                                        )}
                                    </div>

                                    {/* Agrupamentos  */}
                                    <div className="relatorios-graficos__filtro">
                                        <p>Agrupamento</p>
                                        <Controller
                                            control={control}
                                            name="agrupamento"
                                            rules={{
                                                required:
                                                    "O agrupamento é obrigatório",
                                            }}
                                            render={({ field }) => (
                                                <Dropdown
                                                    current={
                                                        agrupamentosMemo.find(
                                                            (v) =>
                                                                v.id ===
                                                                field.value
                                                        )?.nome || null
                                                    }
                                                    lista={agrupamentosMemo}
                                                    isAll={false}
                                                    onSelect={(v) =>
                                                        field.onChange(
                                                            v?.id || null
                                                        )
                                                    }
                                                    isErro={
                                                        !!errors.agrupamento
                                                    }
                                                    selectId={field.value}
                                                />
                                            )}
                                        />
                                        {errors.agrupamento && (
                                            <ErroComponent
                                                erro={errors.agrupamento}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Periodo */}
                                <div className="relatorios-graficos__group-filtro">
                                    <motion.div
                                        layout
                                        className="relatorios-graficos__filtro"
                                    >
                                        <label htmlFor="relatorios-graficos-inicio-input">
                                            Início
                                        </label>
                                        <input
                                            type="date"
                                            className={
                                                errors.dataInicio &&
                                                "input-error"
                                            }
                                            id="relatorios-graficos-inicio-input"
                                            {...register("dataInicio", {
                                                required:
                                                    "A data de início é obrigatória",
                                            })}
                                        />
                                        {errors.dataInicio && (
                                            <ErroComponent
                                                erro={errors.dataInicio}
                                            />
                                        )}
                                    </motion.div>
                                    <motion.div
                                        layout
                                        className="relatorios-graficos__filtro"
                                    >
                                        <label htmlFor="relatorios-graficos-fim-input">
                                            Fim
                                        </label>
                                        <input
                                            type="date"
                                            className={
                                                errors.dataFim && "input-error"
                                            }
                                            id="relatorios-graficos-fim-input"
                                            {...register("dataFim", {
                                                required:
                                                    "A data de fim é obrigatória",
                                                validate: (v) => {
                                                    if (!dataInicio)
                                                        return true;

                                                    return (
                                                        new Date(v) >=
                                                            new Date(
                                                                dataInicio
                                                            ) ||
                                                        "A data final deve ser igual ou posterior à data inicial."
                                                    );
                                                },
                                            })}
                                        />

                                        {errors.dataFim && (
                                            <ErroComponent
                                                erro={errors.dataFim}
                                            />
                                        )}
                                    </motion.div>
                                </div>

                                {/* Escopo */}
                                {!isSecretario.current && (
                                    <div className="relatorios-graficos__group-filtro">
                                        {isSuperAdmin.current && (
                                            <div className="relatorios-graficos__filtro">
                                                <p>Igrejas</p>
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
                                                                setValue(
                                                                    "classes",
                                                                    undefined
                                                                );
                                                                field.onChange(
                                                                    v
                                                                );
                                                            }}
                                                            texto="Todas as igrejas"
                                                        />
                                                    )}
                                                />
                                            </div>
                                        )}

                                        {(isAdmin.current ||
                                            isSuperAdmin.current) && (
                                            <div className="relatorios-graficos__filtro">
                                                <p>Classes</p>
                                                <Controller
                                                    control={control}
                                                    name="classes"
                                                    render={({ field }) => (
                                                        <MultiSelectDropdown
                                                            lista={classesMemo}
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
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Gráfico */}
                                <div className="relatorios-graficos__tipos">
                                    {GRAFICOS.map((v) => (
                                        <div
                                            key={v.id}
                                            className="relatorios-graficos__grafico"
                                        >
                                            <label
                                                htmlFor={
                                                    "relatorios-graficos-grafico-" +
                                                    v.id
                                                }
                                            >
                                                <span>
                                                    <FontAwesomeIcon
                                                        icon={v.icon}
                                                    />
                                                </span>
                                                {v.nome}
                                            </label>
                                            <input
                                                type="radio"
                                                id={
                                                    "relatorios-graficos-grafico-" +
                                                    v.id
                                                }
                                                value={v.id}
                                                {...register("grafico")}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="relatorios-graficos__buttons">
                                <div className="relatorios-graficos__gerar">
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        title="Gerar Relatório Gráfico"
                                        type="submit"
                                    >
                                        <span>
                                            <FontAwesomeIcon
                                                icon={faChartArea}
                                            />
                                        </span>
                                        Gerar Relatório
                                    </motion.button>
                                </div>
                            </div>
                        </form>
                    </FormProvider>
                </div>

                <div className="relatorios-graficos__body">
                    <div className="relatorios-graficos__rechart">
                        {isLoading ? (
                            <DashboardCardSkeleton key={"ss"} />
                        ) : dados.length > 0 ? (
                            <>
                                <div className="relatorios-graficos__rechart-container">
                                    <h3 className="relatorios-graficos__rechart--title">
                                        {title}
                                    </h3>
                                    <button
                                        onClick={() => setModal(true)}
                                        className="relatorios-graficos__rechart--button"
                                    >
                                        <FontAwesomeIcon
                                            icon={
                                                faUpRightAndDownLeftFromCenter
                                            }
                                        />
                                    </button>
                                </div>
                                <GraficoDinamico
                                    dados={dados as any}
                                    tipoGrafico={tipoGrafico}
                                    title={title}
                                />
                            </>
                        ) : (
                            <div className="relatorios-graficos__vazio">
                                <p>
                                    Nenhum resultado encontrado. Faça uma nova
                                    consulta!
                                    <span>
                                        <FontAwesomeIcon
                                            icon={faFaceSmileBeam}
                                        />
                                    </span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <AnimatePresence>
                {modal && (
                    <DashboardCardModal
                        key={"dashboard-card"}
                        chartType="bar"
                        datas={dados}
                        onClose={() => setModal(false)}
                        title={title}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

export default RelatoriosGraficos;
