import { AnimatePresence, motion } from "framer-motion";
import "./dashboard.scss";
import Dropdown from "../../ui/Dropdown";
import DashboardCard from "../../ui/DashboardCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faAddressCard,
    faBook,
    faBookBible,
    faClipboardCheck,
    faListCheck,
    faPlane,
    faSackDollar,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useRef, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../utils/firebase";
import { useAuthContext } from "../../../context/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useDataContext } from "../../../context/DataContext";
import DashboardCardSkeleton from "../../ui/DashboardCardSkeleton";
import { ROLES } from "../../../roles/Roles";
import NotificacaoModal from "../../ui/NotificacaoModal";

const functions = getFunctions();
const getDashboard = httpsCallable(functions, "getDashboard");

function Dashboard() {
    const [options, setOptions] = useState<
        ClasseInterface[] | IgrejaInterface[]
    >([]);
    const [currentOption, setCurrentOption] = useState<{
        id: string;
        nome: string;
    } | null>(null);
    const [pesquisar, setPesquisar] = useState(false);
    const [totalMatriculados, setTotalMatriculados] = useState<
        DashboardInterface[]
    >([]);
    const [totalMissoes, setTotalMissoes] = useState<DashboardInterface[]>([]);
    const [totalOfertas, setTotalOfertas] = useState<DashboardInterface[]>([]);
    const [totalPresentes, setTotalPresentes] = useState<DashboardInterface[]>(
        []
    );
    const [totalBiblias, setTotalBiblias] = useState<DashboardInterface[]>([]);
    const [totalRevistas, setTotalRevistas] = useState<DashboardInterface[]>(
        []
    );
    const [totalMembros, setTotalMembros] = useState<{
        [key: string]: {
            total_membros: number;
            total_matriculados: number;
            engajamento: number | string;
        };
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showNotificacao, setShowNotificacao] = useState(false);

    const matriculasRef = useRef<DashboardInterface[]>([]);
    const membrosRef = useRef<{
        [key: string]: {
            total_membros: number;
            total_matriculados: number;
            engajamento: number | string;
        };
    }>(null);
    const missoesRef = useRef<DashboardInterface[]>([]);
    const ofertasRef = useRef<DashboardInterface[]>([]);
    const presentesRef = useRef<DashboardInterface[]>([]);
    const bibliasRef = useRef<DashboardInterface[]>([]);
    const revistasRef = useRef<DashboardInterface[]>([]);
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
                total_biblias,
                total_licoes,
                total_matriculados,
                total_missoes,
                total_ofertas,
                total_presentes,
                total_membros_matriculados,
            } = data as ResponseGetDashboard;

            setTotalMembros(total_membros_matriculados);
            membrosRef.current = total_membros_matriculados;

            setTotalMissoes(total_missoes);
            missoesRef.current = total_missoes;

            setTotalOfertas(total_ofertas);
            ofertasRef.current = total_ofertas;

            setTotalPresentes(total_presentes);
            presentesRef.current = total_presentes;

            setTotalBiblias(total_biblias);
            bibliasRef.current = total_biblias;

            setTotalRevistas(total_licoes);
            revistasRef.current = total_licoes;

            setTotalMatriculados(total_matriculados);
            matriculasRef.current = total_matriculados;
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
            where("ativo", "==", true)
        );
        const licoes = await getDocs(q);
        const value = licoes.docs.find((v) => v.data().ativo === true)?.data();
        let inicio = new Date().toISOString().split("T")[0];
        let fim = new Date().toISOString().split("T")[0];

        if (value) {
            inicio = value.data_inicio.toDate().toISOString().split("T")[0];
            $dataInicio.current!.value = inicio;

            fim = value.data_fim.toDate().toISOString().split("T")[0];
            $dataFim.current!.value = fim;
        }

        await buscarDadosFirestone(inicio, fim);
    };
    const sum = (array: DashboardInterface[]) => {
        return array.reduce(
            (total, obj) =>
                total +
                Object.values(obj).reduce(
                    (sum, acc) => (typeof acc === "number" ? sum + acc : sum),
                    0
                ),
            0
        );
    };

    useEffect(() => {
        if (pesquisar) {
            setIsLoading(true);
            setCurrentOption(null);
            buscarDadosFirestone(
                $dataInicio.current!.value,
                $dataFim.current!.value
            ).finally(() => {
                setIsLoading(false);
                setPesquisar(false);
            });
        }
    }, [pesquisar]);
    useEffect(() => {
        if (currentOption) {
            const filtrarDados = (dadosOriginais: DashboardInterface[]) => {
                return dadosOriginais.map((dado: DashboardInterface) => ({
                    name: dado.name,
                    [currentOption.nome]: dado[currentOption.nome] || 0,
                }));
            };
            setTotalMatriculados(filtrarDados(matriculasRef.current));
            setTotalMissoes(filtrarDados(missoesRef.current));
            setTotalOfertas(filtrarDados(ofertasRef.current));
            setTotalPresentes(filtrarDados(presentesRef.current));
            setTotalBiblias(filtrarDados(bibliasRef.current));
            setTotalRevistas(filtrarDados(revistasRef.current));

            if (isSuperAdmin.current && membrosRef.current)
                setTotalMembros(
                    membrosRef.current[currentOption.id]
                        ? {
                              [currentOption.id]:
                                  membrosRef.current[currentOption.id],
                          }
                        : null
                );
        } else {
            setTotalMatriculados(matriculasRef.current);
            setTotalMissoes(missoesRef.current);
            setTotalOfertas(ofertasRef.current);
            setTotalPresentes(presentesRef.current);
            setTotalBiblias(bibliasRef.current);
            setTotalRevistas(revistasRef.current);
            setTotalMembros(membrosRef.current);
        }
    }, [currentOption]);
    useEffect(() => {
        if (isSuperAdmin.current) setOptions(igrejas);
        if (isAdmin.current) setOptions(classes);
    }, [igrejas, classes]);
    useEffect(() => {
        if (user) {
            buscarDadosIniciais().finally(() => setIsLoading(false));
        }
    }, [user]);
    useEffect(() => {
        if (options.length === 1)
            setCurrentOption({ id: options[0].id, nome: options[0].nome });
    }, [options]);
    useEffect(() => {
        const jaViuNotificacao = JSON.parse(
            localStorage.getItem("jaViuNotificacao") || "false"
        );
        const isDefault = Notification.permission === "default";
        if (!jaViuNotificacao && isDefault) {
            setShowNotificacao(true);
            localStorage.setItem("jaViuNotificacao", "true");
        }
    }, []);
    return (
        <motion.section className="dashboard-page">
            <motion.h1
                className="dashboard-page__title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                Relatório Geral Trimestral
            </motion.h1>

            <AnimatePresence>
                {showNotificacao && (
                    <NotificacaoModal
                        key={"notifica-modal"}
                        close={() => {
                            setShowNotificacao(false);
                        }}
                    />
                )}
            </AnimatePresence>

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
                <motion.div className="dashboard-page__filter-button">
                    <motion.button
                        whileTap={{ scale: 0.8 }}
                        whileHover={{ y: -5 }}
                        onTap={() => setPesquisar(true)}
                    >
                        Pesquisar
                    </motion.button>
                </motion.div>
            </div>

            <motion.div className="dashboard-page__grid">
                <AnimatePresence>
                    {isLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <DashboardCardSkeleton key={i + "skeleton"} />
                        ))
                    ) : (
                        <>
                            <DashboardCard
                                value={sum(totalOfertas).toLocaleString(
                                    "pt-BR",
                                    {
                                        style: "currency",
                                        currency: "BRL",
                                    }
                                )}
                                title="Total Ofertas"
                                icon={<FontAwesomeIcon icon={faSackDollar} />}
                                datas={totalOfertas}
                                chartType="bar"
                            />

                            <DashboardCard
                                value={sum(totalMissoes).toLocaleString(
                                    "pt-BR",
                                    {
                                        style: "currency",
                                        currency: "BRL",
                                    }
                                )}
                                title="Total Missões"
                                icon={<FontAwesomeIcon icon={faPlane} />}
                                datas={totalMissoes}
                                chartType="bar"
                            />

                            <DashboardCard
                                value={sum(totalPresentes).toString()}
                                title="Total Presentes"
                                icon={<FontAwesomeIcon icon={faListCheck} />}
                                datas={totalPresentes}
                                chartType="area"
                            />

                            <DashboardCard
                                value={sum(totalMatriculados).toString()}
                                title="Total Matriculados"
                                icon={
                                    <FontAwesomeIcon icon={faClipboardCheck} />
                                }
                                datas={totalMatriculados}
                                chartType="area"
                            />

                            {!isSecretario.current &&
                                (() => {
                                    const dados = Object.values(
                                        totalMembros || {}
                                    );

                                    let totalMatriculados = 0;
                                    let totalMembrosCadastrados = 0;

                                    dados.forEach((v) => {
                                        totalMatriculados +=
                                            v.total_matriculados;
                                        totalMembrosCadastrados +=
                                            v.total_membros;
                                    });

                                    const data = [
                                        {
                                            name: "Matriculados",
                                            value: totalMatriculados,
                                        },
                                        {
                                            name: "Não Matriculados",
                                            value:
                                                totalMembrosCadastrados -
                                                totalMatriculados,
                                        },
                                    ];

                                    return (
                                        <DashboardCard
                                            value={`${(
                                                (totalMatriculados /
                                                    totalMembrosCadastrados) *
                                                    100 || 0
                                            ).toFixed(1)}%`}
                                            title="Total Membros Matriculados"
                                            icon={
                                                <FontAwesomeIcon
                                                    icon={faAddressCard}
                                                />
                                            }
                                            datas={data}
                                            chartType="pie"
                                        />
                                    );
                                })()}

                            <DashboardCard
                                value={sum(totalRevistas).toString()}
                                title="Total Revistas"
                                icon={<FontAwesomeIcon icon={faBook} />}
                                datas={totalRevistas}
                                chartType="bar"
                            />

                            <DashboardCard
                                value={sum(totalBiblias).toString()}
                                title="Total Bíblias"
                                icon={<FontAwesomeIcon icon={faBookBible} />}
                                datas={totalBiblias}
                                chartType="bar"
                            />
                        </>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.section>
    );
}

export default Dashboard;
