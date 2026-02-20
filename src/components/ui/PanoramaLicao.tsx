import {
    faBook,
    faBookBible,
    faBookOpen,
    faChalkboardUser,
    faChartColumn,
    faChartLine,
    faChartPie,
    faChevronDown,
    faCoins,
    faEarthAfrica,
    faEye,
    faEyeSlash,
    faFileCsv,
    faFilePen,
    faPiggyBank,
    faPlane,
    faRankingStar,
    faSackDollar,
    faShareNodes,
    faStar,
    faUserCheck,
    faUserClock,
    faUserPlus,
    faUsers,
    faUsersRectangle,
    faUserXmark,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    animate,
    AnimatePresence,
    motion,
    useMotionValue,
    useTransform,
} from "framer-motion";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./panorama-licao.scss";
import SearchInput from "./SearchInput";
import LoadingModal from "../layout/loading/LoadingModal";
import type {
    CacheLicaoInterface,
    DetalhesAlunoCacheLicao,
    DetalhesAulaCacheLicao,
} from "../../interfaces/CacheLicaoInterface";
import type { LicaoInterface } from "../../interfaces/LicaoInterface";
import type { Timestamp } from "firebase/firestore";
import {
    Area,
    Bar,
    BarChart,
    Brush,
    Cell,
    ComposedChart,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import useIsMobile from "../../hooks/useIsMobile";
import { AcordeaoItem, InfoLinha } from "../pages/chamada/ChamadaItens";
import { PedidosRespostaShareModal } from "../pages/pedidos/PedidosResposta";

interface PanoramaChamada {
    presente: number;
    atrasado: number;
    falta: number;
    falta_justificada: number;
    porcentagem: number;
    detalhes: {
        data: string;
        status: string;
        aula: number;
    }[];
}

interface PanoramaItens {
    trouxe: number;
    naoTrouxe: number;
    porcentagem: number;
    detalhes: {
        data: string;
        aula: number;
        status: boolean;
    }[];
}

interface PanoramaProgresso {
    total: number;
    concluidas: number;
}
interface PanoramaLicao {
    progresso: PanoramaProgresso;
    totalAlunos: number;
    mediaPresenca: number;
    totalArrecadado: number;
    frequenciaAlunos: {
        id: string;
        nome: string;
        chamada: PanoramaChamada;
        biblias: PanoramaItens;
        licoes: PanoramaItens;
    }[];
}

interface AulaDocument {
    id: string;
    numero_aula: number;
    data_prevista: Timestamp;
    realizada: boolean;
    registroRef: any;
}

const CORES_GRAFICO = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EC4899",
    "#EF4444",
    "#FACC15",
    "#14B8A6",
    "#22C55E",
    "#6366F1",
    "#F43F5E",
    "#0EA5E9",
    "#D946EF",
    "#84CC16",
    "#A855F7",
];

const getCorDaFrequencia = (porcentagem: number) => {
    if (porcentagem < 50) return "#EF4444";
    if (porcentagem < 75) return "#F59E0B";
    return "#10B981";
};

const gerarCSV = (
    type: "ranking" | "chamada" | "financeiro" | "registros_aula",
    dados: CacheLicaoInterface,
    listaAulas: {
        numero: number;
        data: Date;
        aulaRegistrada: AulaDocument | null;
    }[],
    diasMap: Map<string, DetalhesAulaCacheLicao>,
) => {
    let colunas: string[] = ["igrejaNome", "classeNome"];
    let linhas: string[] = [];
    let valores: any;
    const isNumber = (v: any) => {
        if (typeof v === "number") return v.toLocaleString("pt-BR");
        if (typeof v === "object") return JSON.stringify(v);
        return v;
    };
    const isNome = (v: string) => {
        return v === "igrejaNome" || v === "classeNome";
    };

    switch (type) {
        case "ranking":
            colunas = [
                ...colunas,
                ...Object.keys(
                    Object.values(dados.detalhes_aluno)?.[0] || {},
                ).sort((a, b) => {
                    if (a === "nome") return -1;
                    if (b === "nome") return 1;
                    return 1;
                }),
            ];
            valores = Object.values(dados.detalhes_aluno);
            linhas = valores.map((v: any) =>
                colunas
                    .map((c) =>
                        isNome(c)
                            ? dados[c]
                            : c.includes("porcentagem")
                              ? isNumber(v[c]) + "%"
                              : v[c],
                    )
                    .join(";"),
            );

            break;
        case "chamada":
            colunas = [
                "nome",
                "data",
                ...colunas,
                ...Object.keys(
                    Object.values(
                        diasMap.get(
                            listaAulas
                                .find((v) => v.aulaRegistrada?.realizada)
                                ?.data.toLocaleDateString("pt-BR") || "",
                        )?.chamada || {},
                    )[0] || {},
                ),
            ];
            valores = listaAulas
                .filter((v) => v.aulaRegistrada?.realizada)
                .map((v) =>
                    Object.values(
                        diasMap.get(v.data.toLocaleDateString("pt-BR"))
                            ?.chamada || {},
                    ).map((o: any) => {
                        o.data = v.data.toLocaleDateString("pt-BR");
                        o.nome = dados.detalhes_aluno[o.alunoId].nome;
                        return o;
                    }),
                )
                .flat();
            linhas = valores.map((v: any) => {
                return colunas
                    .map((c) => (isNome(c) ? dados[c] : v[c]))
                    .join(";");
            });
            break;
        case "financeiro":
            colunas = [
                "data",
                ...colunas,
                "missoes",
                "missoes_dinheiro",
                "missoes_pix",
                "ofertas",
                "ofertas_dinheiro",
                "ofertas_pix",
            ];
            valores = listaAulas
                .filter((v) => v.aulaRegistrada?.realizada)
                .map((v) => ({
                    data: v.data.toLocaleString("pt-BR"),
                    ...diasMap.get(v.data.toLocaleDateString("pt-BR")),
                }));
            linhas = valores.map((v: any) =>
                colunas
                    .map((c) => (isNome(c) ? dados[c] : isNumber(v[c])))
                    .join(";"),
            );
            break;
        case "registros_aula":
            colunas = [
                "data",
                ...colunas,
                ...Object.keys(Object.values(dados.detalhes_aulas || {})[0]),
            ];
            valores = listaAulas
                .filter((v) => v.aulaRegistrada?.realizada)
                .map((v) => ({
                    data: v.data.toLocaleDateString("pt-BR"),
                    ...(diasMap.get(v.data.toLocaleDateString("pt-BR")) || {}),
                }));
            linhas = valores.map((v: any) => {
                return colunas
                    .map((c) => (isNome(c) ? dados[c] : isNumber(v[c])))
                    .join(";");
            });
            break;
        default:
            return console.log("Opção Inválida");
    }

    const tabela = [colunas.join(";"), ...linhas].join("\n");

    const blob = new Blob(["\uFEFF" + tabela], {
        type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Detalhes Lição ${dados.licaoNome}`);

    document.body.append(link);

    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
const CSVDownloaModal = ({
    dados,
    diasMap,
    listaAulas,
    onSelect,
}: {
    dados: CacheLicaoInterface;
    listaAulas: {
        numero: number;
        data: Date;
        aulaRegistrada: AulaDocument | null;
    }[];
    diasMap: Map<string, DetalhesAulaCacheLicao>;
    onSelect: () => void;
}) => {
    const TYPES = [
        { nome: "Ranking", icone: faRankingStar, type: "ranking" },
        { nome: "Chamada", icone: faFilePen, type: "chamada" },
        { nome: "Financeiro", icone: faPiggyBank, type: "financeiro" },
        {
            nome: "Registros Aulas",
            icone: faChalkboardUser,
            type: "registros_aula",
        },
    ];

    return (
        <motion.div
            className="csv-download-modal"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
        >
            {TYPES.map((v, i) => (
                <div key={i} className="csv-download-modal__item">
                    <button
                        className="csv-download-modal__item-button"
                        onClick={() => {
                            gerarCSV(v.type as any, dados, listaAulas, diasMap);
                            onSelect();
                        }}
                    >
                        <span>
                            <FontAwesomeIcon icon={v.icone} />
                        </span>
                        <span>{v.nome}</span>
                    </button>
                </div>
            ))}
        </motion.div>
    );
};

const CardProgresso = ({ titulo, valor, icone, children, isCentro }: any) => (
    <motion.div
        className={`card-progresso ${isCentro ? "card-progresso--centro" : ""}`}
    >
        <div className="card-progresso__header">
            <span className="card-progresso__icone">
                <FontAwesomeIcon icon={icone} />
            </span>
            <h3>{titulo}</h3>
        </div>
        <div className="card-progresso__body">
            {valor && <p className="card-progresso__valor">{valor}</p>}
            {children}
        </div>
    </motion.div>
);
const GraficoRosca = ({
    porcentagem,
    cor = "#3b82f6",
}: {
    porcentagem: number | string;
    cor?: string;
}) => (
    <div
        className="grafico-rosca"
        style={
            {
                "--porcentagem": porcentagem,
                "--cor-frequencia": cor,
            } as React.CSSProperties
        }
    >
        <span className="grafico-rosca__texto">{porcentagem}%</span>
    </div>
);
const AcordeaoAluno = ({
    aluno,
    verDetalhes,
    opt,
}: {
    aluno: DetalhesAlunoCacheLicao;
    verDetalhes: (aluno: DetalhesAlunoCacheLicao) => void;
    opt: "chamada" | "revista" | "biblia";
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const { porcentagem, porcentagem_biblia, porcentagem_revista } = aluno;

    const escolha =
        opt === "chamada"
            ? porcentagem
            : opt === "biblia"
              ? porcentagem_biblia
              : porcentagem_revista;
    return (
        <div className="acordeao-aluno">
            <div
                className="acordeao-aluno__header"
                onClick={() => setIsOpen(!isOpen)}
            >
                <p className="acordeao-aluno__nome">{aluno.nome}</p>
                <div className="acordeao-aluno__frequencia">
                    <GraficoRosca
                        porcentagem={escolha.toFixed(1)}
                        cor={getCorDaFrequencia(escolha)}
                    />
                    <motion.span animate={{ rotate: isOpen ? 180 : 0 }}>
                        <FontAwesomeIcon icon={faChevronDown} />
                    </motion.span>
                </div>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        <div className="acordeao-aluno__body">
                            <ul>
                                {opt === "chamada" ? (
                                    <>
                                        <li>
                                            <strong>Presente:</strong>
                                            <span>{aluno.presente}</span>
                                        </li>
                                        <li>
                                            <strong>Atrasado:</strong>
                                            <span>{aluno.atrasado}</span>
                                        </li>
                                        <li>
                                            <strong>Faltas:</strong>
                                            <span>{aluno.falta}</span>
                                        </li>
                                        <li>
                                            <strong>
                                                Faltas Justificadas:
                                            </strong>
                                            <span>
                                                {aluno.falta_justificada}
                                            </span>
                                        </li>
                                    </>
                                ) : (
                                    <>
                                        <li>
                                            <strong>Trouxe:</strong>
                                            <span>
                                                {aluno?.[`trouxe_${opt}`]}
                                            </span>
                                        </li>
                                        <li>
                                            <strong>Não Trouxe:</strong>
                                            <span>
                                                {aluno?.[`nao_trouxe_${opt}`] ||
                                                    0}
                                            </span>
                                        </li>
                                    </>
                                )}
                            </ul>

                            <motion.button
                                onTap={() => verDetalhes(aluno)}
                                className="acordeao-aluno__detalhes"
                            >
                                Ver detalhes
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
const Detalhes = ({
    aluno,
    onClose,
    opt,
    aulas,
    diasMap,
}: {
    aulas: {
        numero: number;
        data: Date;
        aulaRegistrada: AulaDocument | null;
    }[];
    aluno: DetalhesAlunoCacheLicao;
    onClose: () => void;
    opt: "chamada" | "revista" | "biblia";
    diasMap: Map<string, DetalhesAulaCacheLicao>;
}) => {
    const escolha =
        opt === "chamada"
            ? "status"
            : opt === "revista"
              ? "trouxe_licao"
              : "trouxe_biblia";

    const opcao = opt === "biblia" ? "Bíblia" : "Lição";

    return (
        <motion.div
            className="detalhes-aluno__overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <div
                className="detalhes-aluno"
                onClick={(evt) => evt.stopPropagation()}
            >
                <div className="detalhes-aluno__header">
                    <h3>
                        <span>{aluno.nome}</span>{" "}
                        <span
                            className={`${aluno.matriculado ? "matriculado" : ""}`}
                        >
                            {aluno.matriculado
                                ? "Matriculado"
                                : "Não Matriculado"}
                        </span>
                    </h3>
                    <button onClick={onClose}>
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                <ul className="detalhes-aluno__lista">
                    {aulas.map((v) => {
                        return (
                            <li key={v.numero}>
                                <p className="detalhes-aluno__lista--data">
                                    {v.numero} (
                                    {v.data.toLocaleDateString("pt-BR")})
                                </p>
                                <div className="detalhes-aluno__lista--linha"></div>
                                {v.aulaRegistrada?.realizada ? (
                                    <p className="detalhes-aluno__lista--status">
                                        {escolha === "status"
                                            ? diasMap.get(
                                                  v.data.toLocaleDateString(
                                                      "pt-BR",
                                                  ),
                                              )?.chamada?.[aluno.id || ""]?.[
                                                  escolha
                                              ] || (
                                                  <span className="sem-registro">
                                                      Sem registro
                                                  </span>
                                              )
                                            : diasMap.get(
                                                    v.data.toLocaleDateString(
                                                        "pt-BR",
                                                    ),
                                                )?.chamada?.[aluno.id || ""][
                                                    escolha
                                                ] === true
                                              ? `Trouxe ${opcao}`
                                              : `Não Trouxe ${opcao}`}
                                    </p>
                                ) : (
                                    <p className="detalhes-aluno__lista--nao-realizada">
                                        Aula não realizada
                                    </p>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </motion.div>
    );
};
const ToolTipDinheiro = ({ payload, active, label }: any) => {
    if (!active || !payload.length) return null;
    const currencyType = { currency: "BRL", style: "currency" };
    const ofertas = payload.filter((v: any) => v.dataKey.includes("Ofertas"));
    const missoes = payload.filter((v: any) => v.dataKey.includes("Missões"));
    const totalOfertas = ofertas.reduce(
        (prev: any, current: any) => current.value + prev,
        0,
    );
    const totalMissoes = missoes.reduce(
        (prev: any, current: any) => current.value + prev,
        0,
    );
    return (
        <div className="tooltip-dinheiro">
            <div className="tooltip-dinheiro__header">
                <h3>{label}</h3>

                <p>
                    {payload
                        .reduce(
                            (prev: any, current: any) => prev + current.value,
                            0,
                        )
                        .toLocaleString("pt-BR", currencyType)}
                </p>
            </div>

            <div className="tooltip-dinheiro__body">
                <div className="tooltip-dinheiro__secao">
                    {missoes.map((v: any) => (
                        <div key={v.name} className="tooltip-dinheiro__item">
                            <h4 style={{ color: v.color }}>{v.name}</h4>
                            <p>
                                {v.value.toLocaleString("pt-BR", currencyType)}
                            </p>
                        </div>
                    ))}

                    <div className="tooltip-dinheiro__item-total">
                        <h4>Missões</h4>
                        <p>
                            {totalMissoes.toLocaleString("pt-BR", currencyType)}
                        </p>
                    </div>
                </div>
                <div className="tooltip-dinheiro__secao">
                    {ofertas.map((v: any) => (
                        <div key={v.name} className="tooltip-dinheiro__item">
                            <h4 style={{ color: v.color }}>{v.name}</h4>
                            <p>
                                {v.value.toLocaleString("pt-BR", currencyType)}
                            </p>
                        </div>
                    ))}

                    <div className="tooltip-dinheiro__item-total">
                        <h4>Ofertas</h4>
                        <p>
                            {totalOfertas.toLocaleString("pt-BR", currencyType)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
const ResumoAula = ({
    detalhes,
    dados,
    onClose,
}: {
    detalhes: DetalhesAulaCacheLicao & { aula: string };
    dados: CacheLicaoInterface;
    onClose: () => void;
}) => {
    const [secaoAberta, setSecaoAberta] = useState(-1);
    const dadosMemo = useMemo(() => {
        const alunos = new Map();
        for (const id in detalhes.chamada) {
            const status =
                detalhes.chamada[id].status === "Falta" ||
                detalhes.chamada[id].status === "Falta Justificada"
                    ? "Ausentes"
                    : detalhes.chamada[id].status;
            const aluno = alunos.get(status) || [];
            alunos.set(status, [
                ...aluno,
                { alunoNome: dados.detalhes_aluno[id].nome, alunoId: id },
            ]);
        }

        return alunos;
    }, [dados]);
    return (
        <motion.div
            className="resumo-aula__overlay"
            onClick={onClose}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
        >
            <div className="resumo-aula" onClick={(e) => e.stopPropagation()}>
                <div className="resumo-aula__container">
                    <div className="detalhes-aluno__header">
                        <h3>Chamada {detalhes.aula}</h3>
                        <button onClick={onClose}>
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>
                    <div className="resumo-chamada">
                        <div className="resumo-chamada__card">
                            <h3>Resumo de Presença</h3>
                            <InfoLinha
                                icon={faUsersRectangle}
                                label="Matriculados"
                                value={dados.total_matriculados}
                            />
                            <AcordeaoItem
                                titulo="Presentes"
                                icone={faUserCheck}
                                total={detalhes.presentes_chamada}
                                listaAlunos={dadosMemo.get("Presente") || []}
                                secaoId="presentes"
                                secaoAberta={secaoAberta}
                                setSecaoAberta={setSecaoAberta}
                            />
                            <AcordeaoItem
                                titulo="Atrasados"
                                icone={faUserClock}
                                total={detalhes.atrasados}
                                listaAlunos={dadosMemo.get("Atrasado") || []}
                                secaoId="atrasados"
                                secaoAberta={secaoAberta}
                                setSecaoAberta={setSecaoAberta}
                            />
                            <AcordeaoItem
                                titulo="Ausentes"
                                icone={faUserXmark}
                                total={detalhes.ausentes}
                                listaAlunos={dadosMemo.get("Ausentes") || []}
                                secaoId="ausentes"
                                secaoAberta={secaoAberta}
                                setSecaoAberta={setSecaoAberta}
                            />
                            <AcordeaoItem
                                icone={faUserPlus}
                                titulo="Visitas"
                                total={detalhes.visitas}
                                listaAlunos={detalhes.visitas_lista.map(
                                    (v) => ({
                                        alunoId: Date.now(),
                                        alunoNome: v.nome_completo,
                                    }),
                                )}
                                secaoId="visitas"
                                secaoAberta={secaoAberta}
                                setSecaoAberta={setSecaoAberta}
                            />
                            <InfoLinha
                                icon={faUsers}
                                label="TOTAL DE PESSOAS"
                                value={detalhes.total_presenca}
                                isTotal
                            />
                        </div>

                        <div className="resumo-chamada__card">
                            <h3>Dados Gerais</h3>
                            <InfoLinha
                                icon={faBookBible}
                                label="Bíblias"
                                value={detalhes.biblias || 0}
                            />
                            <InfoLinha
                                icon={faBookOpen}
                                label="Revistas"
                                value={detalhes.licoes || 0}
                            />
                            <hr />
                            <InfoLinha
                                icon={faSackDollar}
                                label="Total Ofertas"
                                value={detalhes.ofertas.toLocaleString(
                                    "pt-BR",
                                    {
                                        style: "currency",
                                        currency: "BRL",
                                    },
                                )}
                            />
                            <InfoLinha
                                icon={faPlane}
                                label="Total Missões"
                                value={detalhes.missoes.toLocaleString(
                                    "pt-BR",
                                    {
                                        style: "currency",
                                        currency: "BRL",
                                    },
                                )}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const PanoramaPieChart = ({ datas }: { datas: any[] }) => {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Legend />
                <Tooltip
                    content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;

                        const fatia = payload[0];
                        const corDaFatia = fatia.payload.fill;

                        return (
                            <div
                                className="tooltip-dinheiro"
                                style={{ minWidth: 180 }}
                            >
                                <div className="tooltip-dinheiro__item">
                                    <h4 style={{ color: corDaFatia }}>
                                        {fatia.name}
                                    </h4>
                                    <p>
                                        {fatia.value.toLocaleString("pt-BR", {
                                            currency: "BRL",
                                            style: "currency",
                                        })}
                                    </p>
                                </div>
                            </div>
                        );
                    }}
                />

                <Pie data={datas} nameKey="name">
                    {datas.map((_, i) => (
                        <Cell
                            key={i}
                            fill={CORES_GRAFICO[i + 6]}
                            stroke={CORES_GRAFICO[i + 6]}
                        />
                    ))}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
};
const PanoramaBarChart = ({
    datas,
    keys,
    ends,
    isMobile,
}: {
    datas: any;
    keys: string[];
    ends: number;
    isMobile: boolean;
}) => {
    return (
        <ResponsiveContainer
            width={"100%"}
            height={"100%"}
            minHeight={!isMobile ? 300 : 400}
        >
            <BarChart
                data={datas}
                layout={isMobile ? "vertical" : "horizontal"}
            >
                <Tooltip
                    // position={{ y: 20 }}
                    content={ToolTipDinheiro}
                />

                <Brush
                    dataKey="name"
                    height={15}
                    stroke="#3B82F6"
                    endIndex={ends}
                />

                {!isMobile ? (
                    <>
                        <XAxis dataKey="name" />
                        <YAxis />
                    </>
                ) : (
                    <>
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" />
                    </>
                )}

                {keys.map((v, i) => (
                    <Bar
                        // isAnimationActive={false}
                        stackId={v.split(" ")[0]}
                        dataKey={v}
                        key={v + i}
                        fill={CORES_GRAFICO[i % CORES_GRAFICO.length]}
                        // radius={[4, 4, 0, 0]}
                    />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
};
const PanoramaLineChart = ({
    datas,
    keys,
    ends,
}: {
    datas: any;
    keys: string[];
    ends: number;
    syncId?: string;
}) => {
    return (
        <ResponsiveContainer width={"100%"} height={"100%"} minHeight={300}>
            <LineChart data={datas}>
                <Tooltip
                    // position={{ y: 20 }}
                    content={ToolTipDinheiro}
                />

                <Brush
                    dataKey="name"
                    height={15}
                    stroke="#3B82F6"
                    endIndex={ends}
                />

                <XAxis dataKey="name" />
                <YAxis />

                {keys.map((v, i) => (
                    <Line
                        key={v + i}
                        dataKey={v}
                        fill={CORES_GRAFICO[i % CORES_GRAFICO.length]}
                        stroke={CORES_GRAFICO[i % CORES_GRAFICO.length]}
                        strokeWidth={3}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
};
const PanoramaBarELine = ({
    keys,
    lineKey,
    datas,
    endIndex,
}: {
    keys: { key: string; color: string; stackyId?: string }[];
    lineKey: string;
    datas: any[];
    endIndex?: number;
}) => {
    const [isBar, setIsBar] = useState(true);
    const [visible, setVisible] = useState(
        keys.reduce((prev: any, current) => {
            prev[current.key] = true;
            return prev;
        }, {}),
    );

    const bars = keys.filter((v) => v.key !== lineKey);
    const line = keys.filter((v) => v.key === lineKey);
    return (
        <div className="panorama-graficos__secao">
            <div className="panorama-graficos__options">
                {keys.map((v) => (
                    <div key={v.key} className="panorama-graficos__option">
                        <label htmlFor={v.key + "input" + lineKey}>
                            <span>
                                {visible[v.key] ? (
                                    <FontAwesomeIcon icon={faEye} />
                                ) : (
                                    <FontAwesomeIcon icon={faEyeSlash} />
                                )}
                            </span>
                            <span>{v.key}</span>
                        </label>
                        <input
                            type="checkbox"
                            name={"options-input"}
                            id={v.key + "input" + lineKey}
                            checked={visible[v.key]}
                            onChange={() =>
                                setVisible((opt: any) => ({
                                    ...opt,
                                    [v.key]: !opt[v.key],
                                }))
                            }
                        />
                    </div>
                ))}
            </div>
            <div className="panorama-financeiro__charts-filtro">
                <div className="panorama-financeiro__charts-filtro--input">
                    <label htmlFor={"chart-bar" + lineKey}>
                        <FontAwesomeIcon icon={faChartColumn} />
                    </label>
                    <input
                        type="radio"
                        name={"chart-type" + lineKey}
                        id={"chart-bar" + lineKey}
                        checked={isBar}
                        onChange={() => setIsBar(true)}
                    />
                </div>
                <div className="panorama-financeiro__charts-filtro--input">
                    <label htmlFor={"chart-line" + lineKey}>
                        <FontAwesomeIcon icon={faChartLine} />
                    </label>
                    <input
                        type="radio"
                        name={"chart-type" + lineKey}
                        id={"chart-line" + lineKey}
                        checked={!isBar}
                        onChange={() => setIsBar(false)}
                    />
                </div>
            </div>
            <div className="panorama-financeiro__chart">
                <ResponsiveContainer
                    width={"100%"}
                    height={"100%"}
                    minHeight={300}
                >
                    <ComposedChart data={datas}>
                        <Brush
                            dataKey="name"
                            height={15}
                            stroke="#3B82F6"
                            endIndex={endIndex}
                        />
                        <Tooltip
                            content={({ payload, active, label }) => {
                                if (!active || !payload.length || !payload)
                                    return null;

                                return (
                                    <div className="tooltip-dinheiro">
                                        <div className="tooltip-dinheiro__header">
                                            <h3>{label}</h3>

                                            <p>
                                                {payload.reduce(
                                                    (
                                                        prev: any,
                                                        current: any,
                                                    ) => {
                                                        const valor =
                                                            current.name ===
                                                            lineKey
                                                                ? 0
                                                                : current.value;
                                                        return prev + valor;
                                                    },

                                                    0,
                                                )}
                                            </p>
                                        </div>

                                        <div className="tooltip-dinheiro__secao">
                                            {bars.map((v) => (
                                                <div
                                                    key={v.key}
                                                    className="tooltip-dinheiro__item"
                                                >
                                                    <h4
                                                        style={{
                                                            color: v.color,
                                                        }}
                                                    >
                                                        {v.key}
                                                    </h4>
                                                    <p>
                                                        {payload.find(
                                                            (p) =>
                                                                p.name ===
                                                                v.key,
                                                        )?.value || 0}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="tooltip-dinheiro__secao">
                                            {line.map((v) => (
                                                <div
                                                    key={v.key}
                                                    className="tooltip-dinheiro__item"
                                                >
                                                    <h4
                                                        style={{
                                                            color: v.color,
                                                        }}
                                                    >
                                                        {v.key}
                                                    </h4>
                                                    <p>
                                                        {payload.find(
                                                            (p) =>
                                                                p.name ===
                                                                v.key,
                                                        )?.value || 0}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }}
                        />

                        <XAxis dataKey="name" />
                        <YAxis width={20} />

                        {line.map((v) => {
                            if (visible[v.key] && !isBar)
                                return (
                                    <Area
                                        type="monotone"
                                        key={v.key}
                                        dataKey={v.key}
                                        fill={v.color}
                                        stroke={v.color}
                                    />
                                );
                        })}

                        {bars.map((v) => {
                            if (visible[v.key])
                                return isBar ? (
                                    <Bar
                                        key={v.key}
                                        dataKey={v.key}
                                        stackId={v.stackyId}
                                        fill={v.color}
                                    />
                                ) : (
                                    <Line
                                        key={v.key}
                                        fill={v.color}
                                        stroke={v.color}
                                        strokeWidth={3}
                                        dataKey={v.key}
                                    />
                                );
                        })}

                        {line.map((v) => {
                            if (visible[v.key] && isBar)
                                return (
                                    <Line
                                        key={v.key}
                                        fill={v.color}
                                        stroke={v.color}
                                        strokeWidth={3}
                                        dataKey={v.key}
                                    />
                                );
                        })}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
const PanoramaFinanceiroCharts = ({
    datas,
    keys,
    endIndex,
    isMobile,
}: {
    datas: any;
    keys: string[];
    endIndex: number;
    isMobile: boolean;
}) => {
    const [isBar, setIsBar] = useState(true);

    return (
        <>
            <div className="panorama-financeiro__charts-filtro">
                <div className="panorama-financeiro__charts-filtro--input">
                    <label htmlFor="chart-bar">
                        <FontAwesomeIcon icon={faChartColumn} />
                    </label>
                    <input
                        type="radio"
                        name="chart-type"
                        id="chart-bar"
                        checked={isBar}
                        onChange={() => setIsBar(true)}
                    />
                </div>
                <div className="panorama-financeiro__charts-filtro--input">
                    <label htmlFor="chart-line">
                        <FontAwesomeIcon icon={faChartLine} />
                    </label>
                    <input
                        type="radio"
                        name="chart-type"
                        id="chart-line"
                        checked={!isBar}
                        onChange={() => setIsBar(false)}
                    />
                </div>
            </div>

            <div className="panorama-financeiro__chart">
                {isBar ? (
                    <PanoramaBarChart
                        datas={datas}
                        keys={keys}
                        ends={endIndex}
                        isMobile={isMobile}
                    />
                ) : (
                    <PanoramaLineChart
                        datas={datas}
                        keys={keys}
                        ends={endIndex}
                    />
                )}
            </div>
        </>
    );
};

const PanoramaRanking = React.memo(
    ({
        aulasRealizadas,
        totalDeAulas,
        listaAulas,
        diasMap,
        dados,
    }: {
        aulasRealizadas: number;
        totalDeAulas: number;
        listaAulas: any;
        diasMap: any;
        dados: CacheLicaoInterface;
    }) => {
        const [opt, setOpt] = useState<"chamada" | "revista" | "biblia">(
            "chamada",
        );
        const [detalhes, setDetalhes] = useState<any>(null);
        const [openCSV, setOPenCSV] = useState(false);
        const [share, setShare] = useState(false);
        const [pesquisa, setPesquisa] = useState("");

        const adicionarDetalhes = useCallback((aluno: any) => {
            setDetalhes(aluno);
        }, []);

        const alunosMemo = useMemo(() => {
            if (!dados) return [];

            let alunos = Object.entries(dados.detalhes_aluno || {}).map(
                ([id, v]) => ({ id, ...v }),
            );

            if (!alunos.length) return [];

            alunos = alunos.filter((v) =>
                v.nome?.toLowerCase().includes(pesquisa),
            );

            return alunos.sort(
                (a, b) =>
                    (b as any)[
                        `porcentagem${opt === "chamada" ? "" : `_${opt}`}`
                    ] -
                    (a as any)[
                        `porcentagem${opt === "chamada" ? "" : `_${opt}`}`
                    ],
            );
        }, [dados, pesquisa, opt]);
        return (
            <>
                <div className="panorama-licao__cards-container">
                    <CardProgresso
                        titulo="Progresso do Trimestre"
                        icone={faBook}
                    >
                        <div className="barra-progresso">
                            <motion.div
                                className="barra-progresso__preenchimento"
                                initial={{ width: 0 }}
                                animate={{
                                    width: `${(
                                        (aulasRealizadas / totalDeAulas) *
                                        100
                                    ).toFixed(1)}%`,
                                }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                        <p className="barra-progresso__texto">
                            {aulasRealizadas} de {totalDeAulas} aulas concluídas
                        </p>
                    </CardProgresso>

                    <CardProgresso
                        titulo="Média de Presença"
                        icone={faChartPie}
                    >
                        <GraficoRosca
                            porcentagem={(
                                alunosMemo.reduce(
                                    (prev, acc) => prev + acc.porcentagem,
                                    0,
                                ) / alunosMemo.length || 0
                            ).toFixed(1)}
                        />
                    </CardProgresso>
                </div>

                <div className="panorama-licao__lista-alunos">
                    <div className="panorama-licao__lista-alunos-header">
                        <h3>Frequência Alunos</h3>

                        <div className="panorama-licao__lista-alunos-header-container">
                            <div className="panorama-licao__lista-alunos-header--container">
                                <SearchInput
                                    onSearch={setPesquisa}
                                    texto="Aluno"
                                />
                                <button
                                    title="Gerar CSV"
                                    className="panorama-licao__lista-alunos-header--btn"
                                    onClick={() => setOPenCSV((v) => !v)}
                                >
                                    <FontAwesomeIcon icon={faFileCsv} />
                                </button>
                                <AnimatePresence>
                                    {openCSV && (
                                        <CSVDownloaModal
                                            dados={dados!}
                                            diasMap={diasMap}
                                            listaAulas={listaAulas}
                                            onSelect={() => setOPenCSV(false)}
                                        />
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="panorama-licao__lista-alunos-header--container">
                                <button
                                    className="panorama-licao__lista-alunos-header--btn compartilhar"
                                    onClick={() => setShare(true)}
                                    title="compartilhar ranking"
                                >
                                    <FontAwesomeIcon icon={faShareNodes} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="panorama-licao__opcoes">
                        <div className="panorama-licao__opcoes-check">
                            <input
                                defaultChecked={true}
                                type="radio"
                                name="opcoes"
                                id="chamada"
                                onChange={() => setOpt("chamada")}
                            />
                            <label htmlFor="chamada">Chamada</label>
                        </div>

                        <div className="panorama-licao__opcoes-check">
                            <input
                                type="radio"
                                name="opcoes"
                                id="licao"
                                onChange={() => setOpt("revista")}
                            />
                            <label htmlFor="licao">Lições</label>
                        </div>

                        <div className="panorama-licao__opcoes-check">
                            <input
                                type="radio"
                                name="opcoes"
                                id="biblia"
                                onChange={() => setOpt("biblia")}
                            />
                            <label htmlFor="biblia">Bíblias</label>
                        </div>
                    </div>

                    {alunosMemo.map((aluno) => (
                        <AcordeaoAluno
                            key={aluno.id}
                            aluno={aluno}
                            verDetalhes={adicionarDetalhes}
                            opt={opt}
                        />
                    ))}
                </div>

                <AnimatePresence>
                    {detalhes && (
                        <Detalhes
                            aluno={detalhes}
                            onClose={() => setDetalhes(null)}
                            opt={opt}
                            key={"detalhes-aluno"}
                            aulas={listaAulas}
                            diasMap={diasMap}
                        />
                    )}

                    {share && (
                        <PedidosRespostaShareModal
                            onClose={() => setShare(false)}
                            key={"share"}
                            link={`${window.location.origin}/ranking-alunos/${dados.igrejaId}/${dados.licaoId}`}
                        />
                    )}
                </AnimatePresence>
            </>
        );
    },
);
const PanoramaFinanceiro = React.memo(
    ({
        dados,
        listaAulas,
        diasMap,
        isMobile,
    }: {
        dados: CacheLicaoInterface;
        listaAulas: {
            numero: number;
            data: Date;
            aulaRegistrada: AulaDocument | null;
        }[];
        diasMap: Map<string, DetalhesAulaCacheLicao>;
        isMobile: boolean;
    }) => {
        const valorMissoes = useMotionValue(0);
        const valorOfertas = useMotionValue(0);
        const missoes = useTransform(valorMissoes, (value) =>
            value.toLocaleString("pt-BR", {
                currency: "BRL",
                style: "currency",
            }),
        );
        const ofertas = useTransform(valorOfertas, (value) =>
            value.toLocaleString("pt-BR", {
                currency: "BRL",
                style: "currency",
            }),
        );

        const datasPieDinheiroPix = [
            {
                name: "Total Pix",
                value: dados.total_missoes_pix + dados.total_ofertas_pix,
            },
            {
                name: "Total Dinheiro",
                value:
                    dados.total_missoes_dinheiro + dados.total_ofertas_dinheiro,
            },
        ];
        const datasPieOfertasMissoes = [
            {
                name: "Missões Pix",
                value: dados.total_missoes_pix,
            },
            {
                name: "Missões Dinheiro",
                value: dados.total_missoes_dinheiro,
            },
            {
                name: "Ofertas Pix",
                value: dados.total_ofertas_pix,
            },
            {
                name: "Ofertas Dinheiro",
                value: dados.total_ofertas_dinheiro,
            },
        ];
        const keysChart = [
            "Missões Pix",
            "Missões Dinheiro",
            "Ofertas Pix",
            "Ofertas Dinheiro",
        ];
        const datasCharts = listaAulas.reduce((prev: any[], current) => {
            let name = current.data.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
            });
            const key = current.data.toLocaleDateString("pt-BR");
            const pixMissao = diasMap.get(key)?.missoes_pix || 0;
            const pixOfertas = diasMap.get(key)?.ofertas_pix || 0;
            const dinheiroMissao = diasMap.get(key)?.missoes_dinheiro || 0;
            const dinheiroOferta = diasMap.get(key)?.ofertas_dinheiro || 0;

            const obj = [
                {
                    name,
                    ["Missões Pix"]: pixMissao,
                    ["Missões Dinheiro"]: dinheiroMissao,
                    ["Ofertas Pix"]: pixOfertas,
                    ["Ofertas Dinheiro"]: dinheiroOferta,
                },
            ];

            return [...prev, ...obj];
        }, []) as any[];
        let ends = 1;
        listaAulas.forEach((v, i) =>
            v.aulaRegistrada?.realizada ? (ends = i) : undefined,
        );
        useEffect(() => {
            const anMissoes = animate(valorMissoes, dados.total_missoes, {
                duration: 2,
            });
            const anOfertas = animate(valorOfertas, dados.total_ofertas, {
                duration: 2,
            });

            return () => {
                anMissoes.stop();
                anOfertas.stop();
            };
        }, []);
        return (
            <div className="panorama-financeiro">
                <div className="panorama-financeiro__totais">
                    <CardProgresso titulo="Total Ofertas" icone={faCoins}>
                        <div className="panorama-financeiro__total">
                            <h4>
                                <motion.span>{ofertas}</motion.span>
                            </h4>
                        </div>
                    </CardProgresso>
                    <CardProgresso titulo="Total Missões" icone={faEarthAfrica}>
                        <div className="panorama-financeiro__total">
                            <h4>
                                <motion.span>{missoes}</motion.span>
                            </h4>
                        </div>
                    </CardProgresso>
                </div>

                <div className="panorama-financeiro__pie">
                    <h3>
                        Ofertas <span>vs</span> Missões
                    </h3>

                    <div className="panorama-financeiro__pie-chart">
                        <PanoramaPieChart datas={datasPieOfertasMissoes} />
                    </div>
                </div>

                <div className="panorama-financeiro__charts">
                    <h3>Arrecadação por Domingo</h3>
                    <PanoramaFinanceiroCharts
                        datas={datasCharts}
                        endIndex={ends}
                        keys={keysChart}
                        isMobile={isMobile}
                    />
                </div>

                <div className="panorama-financeiro__pie">
                    <h3>
                        Pix <span>vs</span> Dinheiro
                    </h3>

                    <div className="panorama-financeiro__pie-chart">
                        <PanoramaPieChart datas={datasPieDinheiroPix} />
                    </div>
                </div>
            </div>
        );
    },
);
const PanoramaGrafico = React.memo(
    ({
        listaAulas,
        diasMap,
        isMobile,
    }: {
        dados: CacheLicaoInterface;
        listaAulas: {
            numero: number;
            data: Date;
            aulaRegistrada: AulaDocument | null;
        }[];
        diasMap: Map<string, DetalhesAulaCacheLicao>;
        isMobile: boolean;
    }) => {
        const optionsPresenca = [
            { key: "Presentes", color: "#10B981", stackyId: "presenca" },
            { key: "Visitas", color: "#3B82F6", stackyId: "presenca" },
            { key: "Ausentes", color: "#EF4444" },
        ];
        const optionsEngajamento = [
            { key: "Bíblias", color: "#14B8A6" },
            { key: "Revistas", color: "#FACC15" },
            { key: "Presentes", color: "#A855F7" },
        ];
        const keysFinanceiro = [
            "Missões Pix",
            "Missões Dinheiro",
            "Ofertas Pix",
            "Ofertas Dinheiro",
        ];
        let endIndex = 0;
        const datasPresenca: any[] = [];
        const datasEngajamento: any[] = [];
        const datasFinanceiro: any[] = [];

        listaAulas.forEach((v, i) => {
            const name = v.data.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
            });
            const key = v.data.toLocaleDateString("pt-BR");
            const dia = diasMap.get(key);

            const Presentes = dia?.presentes_chamada || 0;
            const Visitas = dia?.visitas || 0;
            const Ausentes = dia?.ausentes || 0;
            datasPresenca.push({ name, Presentes, Visitas, Ausentes });

            const biblias = dia?.biblias || 0;
            const Revistas = dia?.licoes || 0;
            datasEngajamento.push({
                name,
                ["Bíblias"]: biblias,
                Revistas,
                Presentes,
            });

            const pixMissao = dia?.missoes_pix || 0;
            const pixOfertas = dia?.ofertas_pix || 0;
            const dinheiroMissao = dia?.missoes_dinheiro || 0;
            const dinheiroOferta = dia?.ofertas_dinheiro || 0;

            datasFinanceiro.push({
                name,
                ["Missões Pix"]: pixMissao,
                ["Missões Dinheiro"]: dinheiroMissao,
                ["Ofertas Pix"]: pixOfertas,
                ["Ofertas Dinheiro"]: dinheiroOferta,
            });
            if (v.aulaRegistrada?.realizada) endIndex = i;
        });

        return (
            <div className="panorama-graficos">
                <div className="panorama-graficos__secao">
                    <PanoramaBarELine
                        datas={datasPresenca}
                        lineKey="Ausentes"
                        keys={optionsPresenca}
                        endIndex={endIndex}
                    />
                </div>
                <div className="panorama-graficos__secao">
                    <PanoramaBarELine
                        datas={datasEngajamento}
                        lineKey="Presentes"
                        keys={optionsEngajamento}
                        endIndex={endIndex}
                    />
                </div>
                <div className="panorama-graficos__secao">
                    <PanoramaFinanceiroCharts
                        datas={datasFinanceiro}
                        endIndex={endIndex}
                        keys={keysFinanceiro}
                        isMobile={isMobile}
                    />
                </div>
            </div>
        );
    },
);
const PanoramaResumo = React.memo(
    ({
        listaAulas,
        datasMap,
        dados,
    }: {
        listaAulas: {
            numero: number;
            data: Date;
            aulaRegistrada: AulaDocument | null;
        }[];
        datasMap: Map<string, DetalhesAulaCacheLicao>;
        dados: CacheLicaoInterface;
    }) => {
        const [aula, setAula] = useState<
            (DetalhesAulaCacheLicao & { aula: string }) | null
        >(null);
        return (
            <>
                <div className="panorama-resumo">
                    <div className="panorama-resumo__header">
                        <h3>
                            <span>
                                <FontAwesomeIcon icon={faStar} />
                            </span>
                            <span>Resumo Aulas</span>
                        </h3>
                    </div>

                    <div className="panorama-resumo__body">
                        {listaAulas
                            .filter((v) => v.aulaRegistrada?.realizada)
                            .map((v) => (
                                <div
                                    key={v.numero}
                                    onClick={() =>
                                        setAula({
                                            ...datasMap.get(
                                                v.data.toLocaleDateString(
                                                    "pt-BR",
                                                ),
                                            )!,
                                            aula: v.data.toLocaleDateString(
                                                "pt-BR",
                                            ),
                                        })
                                    }
                                    className="panorama-resumo__aula"
                                >
                                    <div className="panorama-resumo__aula-numero">
                                        <p>Aula {v.numero}</p>

                                        <data
                                            value={v.data.toLocaleDateString(
                                                "pt-BR",
                                            )}
                                        >
                                            {v.data.toLocaleDateString("pt-BR")}
                                        </data>
                                    </div>
                                    <div className="panorama-resumo__aula-detalhes">
                                        <div className="panorama-resumo__aula-detalhes--presentes">
                                            <span>
                                                <FontAwesomeIcon
                                                    icon={faUsers}
                                                />
                                            </span>
                                            <p>
                                                {datasMap.get(
                                                    v.data.toLocaleDateString(
                                                        "pt-BR",
                                                    ),
                                                )?.total_presenca || 0}
                                            </p>
                                        </div>
                                        <div className="panorama-resumo__aula-detalhes--missoes">
                                            <span>
                                                <FontAwesomeIcon
                                                    icon={faCoins}
                                                />
                                            </span>
                                            <p>
                                                {(
                                                    datasMap.get(
                                                        v.data.toLocaleDateString(
                                                            "pt-BR",
                                                        ),
                                                    )?.ofertas || 0
                                                ).toLocaleString("pt-BR", {
                                                    currency: "BRL",
                                                    style: "currency",
                                                })}
                                            </p>
                                        </div>
                                        <div className="panorama-resumo__aula-detalhes--ofertas">
                                            <span>
                                                <FontAwesomeIcon
                                                    icon={faEarthAfrica}
                                                />
                                            </span>
                                            <p>
                                                {(
                                                    datasMap.get(
                                                        v.data.toLocaleDateString(
                                                            "pt-BR",
                                                        ),
                                                    )?.missoes || 0
                                                ).toLocaleString("pt-BR", {
                                                    currency: "BRL",
                                                    style: "currency",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
                <AnimatePresence>
                    {aula && (
                        <ResumoAula
                            dados={dados}
                            detalhes={aula}
                            onClose={() => setAula(null)}
                            key={"resume-aula"}
                        />
                    )}
                </AnimatePresence>
            </>
        );
    },
);

function PanoramaLicao({
    dados,
    isLoading,
    licao,
    listaAulas,
}: {
    dados: CacheLicaoInterface | null;
    licao: LicaoInterface;
    isLoading: boolean;
    listaAulas: {
        numero: number;
        data: Date;
        aulaRegistrada: AulaDocument | null;
    }[];
}) {
    const abas = ["Ranking", "Financeiro", "Gráficos", "Resumo"];
    const [currentAba, setCurrentAba] = useState("Ranking");
    const [detalhesAulas, setDetalhesAulas] = useState<
        DetalhesAulaCacheLicao[]
    >([]);
    const [diasMap, setDiasMap] = useState<Map<string, DetalhesAulaCacheLicao>>(
        new Map(),
    );
    const isMobile = useIsMobile(500);

    useEffect(() => {
        if (!dados) return;
        const chamadaMap = new Map();
        const detalhesAulas = Object.entries(dados.detalhes_aulas).map(
            ([data, v]) => {
                chamadaMap.set(data, v);
                return v;
            },
        );
        setDetalhesAulas(detalhesAulas);
        setDiasMap(chamadaMap);
    }, [dados]);
    return (
        <>
            <div className="panorama-licao">
                {isLoading && !dados ? (
                    <LoadingModal
                        isEnviando={isLoading}
                        mensagem="Carregando"
                    />
                ) : (
                    <>
                        <div className="panorama-licao__header">
                            <div className="panorama-licao__abas">
                                {abas.map((v) => (
                                    <div
                                        key={v}
                                        className={`panorama-licao__aba ${currentAba === v ? "ativo" : ""}`}
                                        onClick={() => setCurrentAba(v)}
                                    >
                                        <p>{v}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="panorama-licao__body">
                            <>
                                {currentAba === "Ranking" ? (
                                    <PanoramaRanking
                                        aulasRealizadas={detalhesAulas.length}
                                        totalDeAulas={licao.numero_aulas}
                                        diasMap={diasMap}
                                        listaAulas={listaAulas}
                                        dados={dados!}
                                    />
                                ) : currentAba === "Financeiro" ? (
                                    <PanoramaFinanceiro
                                        dados={dados!}
                                        diasMap={diasMap}
                                        listaAulas={listaAulas}
                                        isMobile={isMobile}
                                    />
                                ) : currentAba === "Gráficos" ? (
                                    <PanoramaGrafico
                                        dados={dados!}
                                        diasMap={diasMap}
                                        listaAulas={listaAulas}
                                        isMobile={isMobile}
                                    />
                                ) : currentAba === "Resumo" ? (
                                    <PanoramaResumo
                                        datasMap={diasMap}
                                        listaAulas={listaAulas}
                                        dados={dados!}
                                    />
                                ) : (
                                    <></>
                                )}
                            </>
                        </div>
                    </>
                )}
            </div>

            <></>
        </>
    );
}

export { AcordeaoAluno, Detalhes };
export default React.memo(PanoramaLicao);
