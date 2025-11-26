import {
    faBook,
    faChartPie,
    faChevronDown,
    faCoins,
    faFileCsv,
    faUsers,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import "./panorama-licao.scss";
import SearchInput from "./SearchInput";
import LoadingModal from "../layout/loading/LoadingModal";

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

const getCorDaFrequencia = (porcentagem: number) => {
    if (porcentagem < 50) return "#EF4444";
    if (porcentagem < 75) return "#F59E0B";
    return "#10B981";
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
    porcentagem: number;
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
    aluno: {
        id: string;
        nome: string;
        chamada: PanoramaChamada;
        biblias: PanoramaItens;
        licoes: PanoramaItens;
    };
    verDetalhes: () => void;
    opt: "chamada" | "licoes" | "biblias";
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const escolha = aluno[opt] as any;

    return (
        <div className="acordeao-aluno">
            <div
                className="acordeao-aluno__header"
                onClick={() => setIsOpen(!isOpen)}
            >
                <p className="acordeao-aluno__nome">{aluno.nome}</p>
                <div className="acordeao-aluno__frequencia">
                    <GraficoRosca
                        porcentagem={escolha.porcentagem}
                        cor={getCorDaFrequencia(escolha.porcentagem)}
                    />
                    <motion.span animate={{ rotate: isOpen ? 180 : 0 }}>
                        <FontAwesomeIcon icon={faChevronDown} />
                    </motion.span>
                </div>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="acordeao-aluno__body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        <ul>
                            {opt === "chamada" ? (
                                <>
                                    <li>
                                        <strong>Presente:</strong>
                                        <span>{escolha.presente}</span>
                                    </li>
                                    <li>
                                        <strong>Atrasado:</strong>
                                        <span>{escolha.atrasado}</span>
                                    </li>
                                    <li>
                                        <strong>Faltas:</strong>
                                        <span>{escolha.falta}</span>
                                    </li>
                                    <li>
                                        <strong>Faltas Justificadas:</strong>
                                        <span>{escolha.falta_justificada}</span>
                                    </li>
                                </>
                            ) : (
                                <>
                                    <li>
                                        <strong>Trouxe:</strong>
                                        <span>{escolha.trouxe}</span>
                                    </li>
                                    <li>
                                        <strong>Não Trouxe:</strong>
                                        <span>{escolha.naoTrouxe}</span>
                                    </li>
                                </>
                            )}
                        </ul>

                        <motion.button
                            onTap={verDetalhes}
                            className="acordeao-aluno__detalhes"
                        >
                            Ver detalhes
                        </motion.button>
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
}: {
    aluno: {
        id: string;
        nome: string;
        chamada: PanoramaChamada;
        biblias: PanoramaItens;
        licoes: PanoramaItens;
    };
    onClose: () => void;
    opt: "chamada" | "licoes" | "biblias";
}) => {
    const escolha = aluno[opt];
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
                    <h3>{aluno.nome}</h3>
                    <button onClick={onClose}>
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                <ul className="detalhes-aluno__lista">
                    {escolha.detalhes
                        .sort((a: any, b: any) => a.aula - b.aula)
                        .map((v: any, i: number) => {
                            return (
                                <li key={aluno.id + i}>
                                    <p className="detalhes-aluno__lista--data">
                                        {v.aula} - {v.data}
                                    </p>
                                    <div className="detalhes-aluno__lista--linha"></div>
                                    <p className="detalhes-aluno__lista--status">
                                        {typeof v.status !== "boolean"
                                            ? v.status
                                            : v.status
                                            ? `Trouxe ${
                                                  opt === "licoes"
                                                      ? "Lição"
                                                      : "Biblía"
                                              }`
                                            : `Não Trouxe ${
                                                  opt === "licoes"
                                                      ? "Lição"
                                                      : "Biblía"
                                              }`}
                                    </p>
                                </li>
                            );
                        })}
                </ul>
            </div>
        </motion.div>
    );
};

const gerarCSV = (
    dados: {
        id: string;
        nome: string;
        chamada: PanoramaChamada;
        biblias: PanoramaItens;
        licoes: PanoramaItens;
    }[],
    igrejaNome: string,
    classeNome: string,
    licaoNome: string
) => {
    const { chamada } = dados[0];
    const colunas = [
        "igreja",
        "classe",
        "id",
        "nome",
        ...Object.keys(chamada),
        "trouxe_licao",
        "nao_trouxe_licao",
        "detalhes_licao",
        "porcentagem_licao",
        "trouxe_biblia",
        "nao_trouxe_biblia",
        "detalhes_biblia",
        "porcentagem_biblia",
    ];

    const linhas = dados.map((v) => {
        const linhasChamada = Object.values({
            ...v.chamada,
            detalhes: JSON.stringify(v.chamada.detalhes),
        });
        const linhasLicao = Object.values({
            ...v.licoes,
            detalhes: JSON.stringify(v.licoes.detalhes),
        });
        const linhasBiblias = Object.values({
            ...v.biblias,
            detalhes: JSON.stringify(v.biblias.detalhes),
        });

        return [
            igrejaNome,
            classeNome,
            v.id,
            v.nome,
            ...linhasChamada,
            ...linhasLicao,
            ...linhasBiblias,
        ].join(";");
    });

    const tabela = [colunas.join(";"), ...linhas].join("\n");

    const blob = new Blob([tabela], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Detalhes Lição ${licaoNome}`);

    document.body.append(link);

    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

function PanoramaLicao({
    dados,
    isLoading,
    igrejaNome,
    classeNome,
    licaoNome,
}: {
    dados: PanoramaLicao;
    isLoading: boolean;
    igrejaNome: string;
    classeNome: string;
    licaoNome: string;
}) {
    const [pesquisa, setPesquisa] = useState("");
    const [detalhes, setDetalhes] = useState<any>(null);
    const [opt, setOpt] = useState<"chamada" | "licoes" | "biblias">("chamada");
    const alunosMemo = useMemo(() => {
        if (!dados?.frequenciaAlunos) return [];

        let alunos = dados?.frequenciaAlunos.filter((v) =>
            v.nome?.toLowerCase().includes(pesquisa)
        );

        return alunos;
    }, [dados?.frequenciaAlunos, pesquisa]);

    return (
        <>
            <div className="panorama-licao">
                {isLoading ? (
                    <LoadingModal
                        isEnviando={isLoading}
                        mensagem="Carregando"
                    />
                ) : (
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
                                            width: `${
                                                (dados.progresso.concluidas /
                                                    dados.progresso.total) *
                                                100
                                            }%`,
                                        }}
                                        transition={{
                                            duration: 1,
                                            ease: "easeOut",
                                        }}
                                    />
                                </div>
                                <p className="barra-progresso__texto">
                                    {dados.progresso.concluidas} de{" "}
                                    {dados.progresso.total} aulas concluídas
                                </p>
                            </CardProgresso>

                            <CardProgresso
                                titulo="Média de Presença"
                                icone={faChartPie}
                            >
                                <GraficoRosca
                                    porcentagem={dados.mediaPresenca}
                                />
                            </CardProgresso>

                            <CardProgresso
                                titulo="Alunos Matriculados"
                                icone={faUsers}
                                valor={dados.totalAlunos}
                            />
                            <CardProgresso
                                titulo="Total Arrecadado"
                                icone={faCoins}
                                valor={dados.totalArrecadado.toLocaleString(
                                    "pt-BR",
                                    { currency: "BRL", style: "currency" }
                                )}
                                isCentro={true}
                            />
                        </div>

                        <div className="panorama-licao__lista-alunos">
                            <div className="panorama-licao__lista-alunos-header">
                                <h3>Frequência Alunos</h3>

                                <div className="panorama-licao__lista-alunos-header--container">
                                    <SearchInput
                                        onSearch={(v) => setPesquisa(v)}
                                        texto="Aluno"
                                    />
                                    <button
                                        title="Gerar CSV"
                                        className="panorama-licao__lista-alunos-header--btn"
                                        onClick={() =>
                                            gerarCSV(
                                                dados.frequenciaAlunos,
                                                igrejaNome,
                                                classeNome,
                                                licaoNome
                                            )
                                        }
                                    >
                                        <FontAwesomeIcon icon={faFileCsv} />
                                    </button>
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
                                        onChange={() => setOpt("licoes")}
                                    />
                                    <label htmlFor="licao">Lições</label>
                                </div>

                                <div className="panorama-licao__opcoes-check">
                                    <input
                                        type="radio"
                                        name="opcoes"
                                        id="biblia"
                                        onChange={() => setOpt("biblias")}
                                    />
                                    <label htmlFor="biblia">Biblías</label>
                                </div>
                            </div>

                            {alunosMemo
                                .sort(
                                    (a, b) =>
                                        b[opt].porcentagem - a[opt].porcentagem
                                )
                                .map((aluno) => (
                                    <AcordeaoAluno
                                        key={aluno.id}
                                        aluno={aluno}
                                        verDetalhes={() => setDetalhes(aluno)}
                                        opt={opt}
                                    />
                                ))}
                        </div>
                    </>
                )}
            </div>
            <AnimatePresence>
                {!isLoading && detalhes && (
                    <Detalhes
                        aluno={detalhes}
                        onClose={() => setDetalhes(null)}
                        opt={opt}
                        key={"detalhes-aluno"}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

export default PanoramaLicao;
