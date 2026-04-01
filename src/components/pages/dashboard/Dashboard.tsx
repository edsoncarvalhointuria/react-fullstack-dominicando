import { motion } from "framer-motion";
import "./dashboard.scss";
import Dropdown from "../../ui/Dropdown";
import DashboardCard from "../../ui/DashboardCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faAddressCard,
    faBook,
    faBookBible,
    faChartColumn,
    faClipboardCheck,
    faGhost,
    faListCheck,
    faPlane,
    faSackDollar,
} from "@fortawesome/free-solid-svg-icons";
import React, { useEffect, useRef, useState } from "react";
import {
    collection,
    getDocs,
    limit,
    orderBy,
    query,
    where,
} from "firebase/firestore";
import { db } from "../../../utils/firebase";
import { useAuthContext } from "../../../context/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useDataContext } from "../../../context/DataContext";
import DashboardCardSkeleton from "../../ui/DashboardCardSkeleton";
import { ROLES } from "../../../roles/Roles";

const functions = getFunctions();
const getDashboard = httpsCallable(functions, "getDashboard");

interface StateCharts {
    total_matriculados: DashboardInterface[];
    total_biblias: DashboardInterface[];
    total_licoes: DashboardInterface[];
    total_missoes: DashboardInterface[];
    total_ofertas: DashboardInterface[];
    total_presentes: DashboardInterface[];
    total_ausentes: DashboardInterface[];
    total_membros_matriculados: {
        [key: string]: {
            total_membros: number;
            total_matriculados: number;
            engajamento: number | string;
        };
    };
}

const ChartMembros = React.memo(
    ({
        value,
    }: {
        value: {
            [key: string]: {
                total_membros: number;
                total_matriculados: number;
                engajamento: number | string;
            };
        };
    }) => {
        const dados = Object.values(value || {});

        let totalMatriculados = 0;
        let totalMembrosCadastrados = 0;

        dados.forEach((v) => {
            totalMatriculados += v.total_matriculados;
            totalMembrosCadastrados += v.total_membros;
        });

        const data = [
            {
                name: "Matriculados",
                value: totalMatriculados,
            },
            {
                name: "Não Matriculados",
                value: totalMembrosCadastrados - totalMatriculados,
            },
        ];

        return (
            <DashboardCard
                value={`${(
                    (totalMatriculados / totalMembrosCadastrados) * 100 || 0
                ).toFixed(1)}%`}
                title="Total Membros Matriculados"
                icon={<FontAwesomeIcon icon={faAddressCard} />}
                datas={data}
                chartType="pie"
            />
        );
    },
);
function Dashboard() {
    const [options, setOptions] = useState<
        ClasseInterface[] | IgrejaInterface[]
    >([]);
    const [currentOption, setCurrentOption] = useState<{
        id: string;
        nome: string;
    } | null>(null);
    const [disable, setDisable] = useState(false);
    const [charts, setCharts] = useState<StateCharts | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [inicio, setInicio] = useState(true);

    const chartsRef = useRef<StateCharts>(null);
    const $dataInicio = useRef<HTMLInputElement>(null);
    const $dataFim = useRef<HTMLInputElement>(null);

    const { user, isSuperAdmin, isAdmin, isSecretario } = useAuthContext();
    const { classes, igrejas } = useDataContext();

    const buscarDadosFirestone = async (inicio: string, fim: string) => {
        // Pegando dados firebase function
        try {
            const { data } = await getDashboard({
                dataInicio: new Date(inicio),
                dataFim: new Date(fim),
            });
            const {
                total_matriculados,
                total_biblias,
                total_licoes,
                total_missoes,
                total_ofertas,
                total_presentes,
                total_ausentes,
                total_membros_matriculados,
            } = data as ResponseGetDashboard;

            const obj = {
                total_matriculados,
                total_biblias,
                total_licoes,
                total_missoes,
                total_ofertas,
                total_presentes,
                total_ausentes,
                total_membros_matriculados,
            };

            setCharts(obj);
            chartsRef.current = obj;
        } catch (Error) {
            console.log("Deu esse erro: ", Error);
        }
    };
    const buscarDadosIniciais = async () => {
        if (!user) return;

        // Pegando data
        const licoesCollection = collection(db, "licoes");
        let q = query(
            licoesCollection,
            !isSuperAdmin.current
                ? where("igrejaId", "==", user.igrejaId)
                : where("ministerioId", "==", user.ministerioId),
            where("ativo", "==", true),
            orderBy("data_inicio", "desc"),
            limit(1),
        );
        const licoes = await getDocs(q);
        const value = licoes.docs[0]?.data();
        let inicio = new Date().toISOString().split("T")[0];
        let fim = new Date().toISOString().split("T")[0];

        if (value) {
            inicio = value.data_inicio.toDate().toISOString().split("T")[0];
            $dataInicio.current!.value = inicio;

            fim = value.data_fim.toDate().toISOString().split("T")[0];
            $dataFim.current!.value = fim;
        }

        // await buscarDadosFirestone(inicio, fim);
    };
    const sum = (array: DashboardInterface[]) => {
        return array?.reduce(
            (total, obj) =>
                total +
                Object.values(obj).reduce(
                    (sum, acc) => (typeof acc === "number" ? sum + acc : sum),
                    0,
                ),
            0,
        );
    };
    const buscar = () => {
        setInicio(false);
        setDisable(true);
        setIsLoading(true);
        setCurrentOption(null);
        buscarDadosFirestone(
            $dataInicio.current!.value,
            $dataFim.current!.value,
        ).finally(() => {
            setIsLoading(false);
            setDisable(false);
        });
    };

    useEffect(() => {
        if (currentOption) {
            const filtrarDados = (dadosOriginais: DashboardInterface[]) => {
                return dadosOriginais.map((dado: DashboardInterface) => ({
                    name: dado.name,
                    [currentOption.nome]: dado[currentOption.nome] || 0,
                }));
            };

            if (chartsRef.current) {
                const obj: any = {};
                for (const key in chartsRef.current) {
                    if (key !== "total_membros_matriculados")
                        obj[key] = filtrarDados(
                            (chartsRef.current as any)[key],
                        );
                }

                if (!isSecretario.current) {
                    obj["total_membros_matriculados"] = chartsRef.current[
                        "total_membros_matriculados"
                    ][currentOption.id]
                        ? {
                              [currentOption.id]:
                                  chartsRef.current[
                                      "total_membros_matriculados"
                                  ][currentOption.id],
                          }
                        : null;
                }

                setCharts(obj);
            }
        } else setCharts(chartsRef.current);
    }, [currentOption]);
    useEffect(() => {
        if (options.length === 1)
            setCurrentOption({ id: options[0].id, nome: options[0].nome });
    }, [options]);
    useEffect(() => {
        if (classes.length) {
            buscarDadosIniciais().finally(() => setIsLoading(false));
            if (isSuperAdmin.current) setOptions(igrejas);
            if (isAdmin.current) setOptions(classes);
        }
    }, [classes, igrejas]);

    return (
        <motion.section className="dashboard-page">
            <h1 className="dashboard-page__title">
                Relatório Geral Trimestral
            </h1>

            <div className="dashboard-page__filters">
                <div className="dashboard-page__filters-container">
                    {options.length > 0 && (
                        <div className="dashboard-page__filter-group">
                            <p>
                                {user?.role === ROLES.SUPER_ADMIN ||
                                user?.role === ROLES.PASTOR_PRESIDENTE
                                    ? "Igreja"
                                    : "Classe"}
                            </p>
                            <Dropdown
                                key={"igrejas-drop-down"}
                                lista={options}
                                onSelect={(v) => setCurrentOption(v)}
                                current={currentOption?.nome || null}
                                selectId={currentOption?.id}
                            />
                        </div>
                    )}

                    <div className="dashboard-page__filter-group">
                        <label htmlFor="inicio-input">Início</label>
                        <input
                            ref={$dataInicio}
                            type="date"
                            name="inicio-input"
                            id="inicio-input"
                        />
                    </div>

                    <div className="dashboard-page__filter-group">
                        <label htmlFor="fim-input">Fim</label>
                        <input
                            ref={$dataFim}
                            type="date"
                            name="fim-input"
                            id="fim-input"
                        />
                    </div>
                </div>
                <div className="dashboard-page__filter-button">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ y: -5 }}
                        onTap={buscar}
                        disabled={disable}
                    >
                        Pesquisar
                    </motion.button>
                </div>
            </div>

            <div className="dashboard-page__grid">
                {inicio ? (
                    <div className="dashboard-page__sem-itens">
                        <div className="dashboard-page__sem-itens-titulo">
                            <h3>Clique em pesquisar para gerar os dados</h3>
                            <span>
                                <FontAwesomeIcon icon={faChartColumn} />
                            </span>
                        </div>

                        <div className="dashboard-page__filter-button">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                whileHover={{ y: -5 }}
                                onTap={buscar}
                                disabled={disable}
                            >
                                Pesquisar
                            </motion.button>
                        </div>
                    </div>
                ) : isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <DashboardCardSkeleton key={i + "skeleton"} />
                    ))
                ) : (
                    <>
                        <DashboardCard
                            withIndex={!isSecretario.current}
                            value={sum(
                                charts?.total_ofertas || [],
                            ).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                            title="Total Ofertas"
                            icon={<FontAwesomeIcon icon={faSackDollar} />}
                            datas={charts?.total_ofertas || []}
                            chartType="bar"
                        />

                        <DashboardCard
                            withIndex={!isSecretario.current}
                            value={sum(
                                charts?.total_missoes || [],
                            ).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                            title="Total Missões"
                            icon={<FontAwesomeIcon icon={faPlane} />}
                            datas={charts?.total_missoes || []}
                            chartType="bar"
                        />

                        <DashboardCard
                            withIndex={!isSecretario.current}
                            value={Math.floor(
                                sum(charts?.total_presentes || []) /
                                    (charts?.total_presentes || []).length,
                            ).toString()}
                            title="Total Presentes"
                            icon={<FontAwesomeIcon icon={faListCheck} />}
                            datas={charts?.total_presentes || []}
                            chartType="area"
                        />
                        <DashboardCard
                            withIndex={!isSecretario.current}
                            value={Math.floor(
                                sum(charts?.total_ausentes || []) /
                                    (charts?.total_ausentes || []).length,
                            ).toString()}
                            title="Total Ausentes"
                            icon={<FontAwesomeIcon icon={faGhost} />}
                            datas={charts?.total_ausentes || []}
                            chartType="area"
                        />

                        <DashboardCard
                            withIndex={!isSecretario.current}
                            value={sum(
                                charts?.total_matriculados || [],
                            ).toString()}
                            title="Total Matriculados"
                            icon={<FontAwesomeIcon icon={faClipboardCheck} />}
                            datas={charts?.total_matriculados || []}
                            chartType="bar"
                        />

                        {!isSecretario.current && (
                            <ChartMembros
                                value={charts?.total_membros_matriculados || {}}
                            />
                        )}

                        <DashboardCard
                            withIndex={!isSecretario.current}
                            value={Math.floor(
                                sum(charts?.total_licoes || []) /
                                    (charts?.total_licoes || []).length,
                            ).toString()}
                            title="Total Revistas"
                            icon={<FontAwesomeIcon icon={faBook} />}
                            datas={charts?.total_licoes || []}
                            chartType="bar"
                        />

                        <DashboardCard
                            withIndex={!isSecretario.current}
                            value={Math.floor(
                                sum(charts?.total_biblias || []) /
                                    (charts?.total_biblias || []).length,
                            ).toString()}
                            title="Total Bíblias"
                            icon={<FontAwesomeIcon icon={faBookBible} />}
                            datas={charts?.total_biblias || []}
                            chartType="bar"
                        />
                    </>
                )}
            </div>
        </motion.section>
    );
}

export default Dashboard;
