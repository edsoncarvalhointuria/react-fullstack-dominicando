import {
    faBook,
    faChartPie,
    faChevronDown,
    faFileCsv,
    faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import "./panorama-licao.scss";
import SearchInput from "./SearchInput";
import LoadingModal from "../layout/loading/LoadingModal";

const getCorDaFrequencia = (porcentagem: number) => {
    if (porcentagem < 50) return "#EF4444";
    if (porcentagem < 75) return "#F59E0B";
    return "#10B981";
};

const CardProgresso = ({ titulo, valor, icone, children }: any) => (
    <motion.div className="card-progresso">
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

const AcordeaoAluno = ({ aluno }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="acordeao-aluno">
            <div
                className="acordeao-aluno__header"
                onClick={() => setIsOpen(!isOpen)}
            >
                <p className="acordeao-aluno__nome">{aluno.nome}</p>
                <div className="acordeao-aluno__frequencia">
                    <GraficoRosca
                        porcentagem={aluno.presenca}
                        cor={getCorDaFrequencia(aluno.presenca)}
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
                                <strong>Faltas Justificadas:</strong>
                                <span>{aluno.falta_justificada}</span>
                            </li>
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const gerarCSV = (
    dados: { [key: string]: any }[],
    igrejaNome: string,
    classeNome: string,
    licaoNome: string
) => {
    const colunas = Object.keys(dados[0] || {});
    const linhas = dados.map((v) =>
        [igrejaNome, classeNome, ...colunas.map((c) => v[c])].join(";")
    );
    const tabela = [["igreja", "classe", ...colunas].join(";"), ...linhas].join(
        "\n"
    );

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
    dados: {
        progresso: { [key: string]: number };
        totalAlunos: number;
        mediaPresenca: number;
        totalArrecadado: number;
        frequenciaAlunos: { [key: string]: any }[];
    };
    isLoading: boolean;
    igrejaNome: string;
    classeNome: string;
    licaoNome: string;
}) {
    const [pesquisa, setPesquisa] = useState("");
    const alunosMemo = useMemo(() => {
        let alunos = dados?.frequenciaAlunos.filter((v) =>
            v.nome?.toLowerCase().includes(pesquisa)
        );

        return alunos;
    }, [dados?.frequenciaAlunos, pesquisa]);

    return (
        <div className="panorama-licao">
            {isLoading ? (
                <LoadingModal isEnviando={isLoading} mensagem="Carregando" />
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
                            <GraficoRosca porcentagem={dados.mediaPresenca} />
                        </CardProgresso>

                        <CardProgresso
                            titulo="Alunos Matriculados"
                            icone={faUsers}
                            valor={dados.totalAlunos}
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

                        {alunosMemo
                            .sort((a, b) => b.presenca - a.presenca)
                            .map((aluno) => (
                                <AcordeaoAluno key={aluno.id} aluno={aluno} />
                            ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default PanoramaLicao;
