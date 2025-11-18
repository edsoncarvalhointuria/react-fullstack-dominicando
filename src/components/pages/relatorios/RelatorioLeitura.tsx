import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowLeft,
    faArrowRight,
    faUsers,
    faUserCheck,
    faUserPlus,
    faBookBible,
    faBookOpen,
    faSackDollar,
    faCakeCandles,
    faListOl,
    faXmark,
    faGhost,
    faAlarmClock,
    faEarthAfrica,
    faMoneyBill, // Adicionado para consistência
} from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import "./relatorio-leitura.scss";
import type { ResponseGetRelatorioDominical } from "../../../interfaces/ResponseGetRelatorioDominical";
import { faPix } from "@fortawesome/free-brands-svg-icons";

interface RelatorioLeituraProps {
    fila: (ClasseInterface & { id: string })[];
    dados: ResponseGetRelatorioDominical;
    domingo: Date;
    onSair: () => void;
}

const slideVariants: Variants = {
    hidden: (direcao: number) => ({
        x: direcao > 0 ? "100%" : "-50%",
        opacity: 0,
        transition: { duration: 0.2 },
    }),
    visible: {
        x: 0,
        opacity: 1,
        transition: { delay: 0.3 },
        // transition: { type: "tween", duration: 1, ease: "easeInOut" },
    },
    exit: (direcao: number) => ({
        x: direcao < 0 ? "50%" : "-100%",
        opacity: 0,
        transition: { duration: 0.2 },
        // transition: { type: "tween", duration: 1, ease: "easeInOut" },
    }),
};

const InfoLinha = ({
    icon,
    label,
    value,
    isMenor = false,
}: {
    icon: any;
    label: string;
    value: string | number;
    isMenor?: boolean;
}) => (
    <div className="info-linha">
        <div
            className={`info-linha__label ${
                isMenor && "info-linha__label--menor"
            }`}
        >
            <FontAwesomeIcon icon={icon} />
            <span>{label}</span>
        </div>
        <div
            className={`info-linha__valor ${
                isMenor && "info-linha__valor--menor"
            }`}
        >
            {value}
        </div>
    </div>
);

function RelatorioLeitura({
    fila,
    dados,
    domingo,
    onSair,
}: RelatorioLeituraProps) {
    const filaCompleta = [
        ...fila,
        { id: "totais", nome: "Totais Gerais" },
        { id: "aniversariantes", nome: "Aniversariantes da Semana" },
    ];

    const [indiceAtual, setIndiceAtual] = useState(0);
    const [direcao, setDirecao] = useState(0);

    const itemAtual = filaCompleta[indiceAtual];
    const isClasse = !!dados.totais_classes[itemAtual.id];
    const isTotais = itemAtual.id === "totais";
    const isAniversariantes = itemAtual.id === "aniversariantes";

    const proximoSlide = () => {
        setDirecao(1);
        setIndiceAtual((i) => Math.min(i + 1, filaCompleta.length - 1));
    };

    const slideAnterior = () => {
        setDirecao(-1);
        setIndiceAtual((i) => Math.max(i - 1, 0));
    };
    return (
        <motion.div
            className="relatorio-leitura"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="relatorio-leitura__header">
                <h2>
                    Relatório geral
                    <span>
                        {domingo.toLocaleDateString("pt-BR", {
                            dateStyle: "long",
                        })}
                    </span>
                </h2>
                <button
                    onClick={onSair}
                    className="relatorio-leitura__sair-btn"
                    title="Sair do modo leitura"
                >
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>

            <div className="relatorio-leitura__body">
                <AnimatePresence custom={direcao}>
                    <motion.div
                        key={indiceAtual}
                        className="relatorio-leitura__slide"
                        variants={slideVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        custom={direcao}
                    >
                        {isClasse && (
                            <motion.div
                                variants={slideVariants}
                                className="relatorio-card"
                                key={"classe-relatorio-leitura"}
                            >
                                <h3>{itemAtual.nome}</h3>
                                <InfoLinha
                                    icon={faUsers}
                                    label="Matriculados"
                                    value={
                                        dados.totais_classes[itemAtual.id]
                                            .total_matriculados || 0
                                    }
                                />
                                <InfoLinha
                                    icon={faUserCheck}
                                    label="Presentes"
                                    value={
                                        dados.totais_classes[itemAtual.id]
                                            .presentes_chamada || 0
                                    }
                                />
                                <InfoLinha
                                    icon={faUserPlus}
                                    label="Visitantes"
                                    value={
                                        dados.totais_classes[itemAtual.id]
                                            .visitas || 0
                                    }
                                />
                                <InfoLinha
                                    icon={faAlarmClock}
                                    label="Atrasados"
                                    value={
                                        dados.totais_classes[itemAtual.id]
                                            .atrasados || 0
                                    }
                                />
                                <InfoLinha
                                    icon={faGhost}
                                    label="Ausentes"
                                    value={
                                        dados.totais_classes[itemAtual.id]
                                            .total_ausentes || 0
                                    }
                                />
                                <hr />
                                <InfoLinha
                                    icon={faListOl}
                                    label="Total de Pessoas"
                                    value={
                                        dados.totais_classes[itemAtual.id]
                                            .total_presentes || 0
                                    }
                                />
                                <hr />
                                <InfoLinha
                                    icon={faBookBible}
                                    label="Bíblias"
                                    value={
                                        dados.totais_classes[itemAtual.id]
                                            .biblias || 0
                                    }
                                />
                                <InfoLinha
                                    icon={faBookOpen}
                                    label="Revistas"
                                    value={
                                        dados.totais_classes[itemAtual.id]
                                            .licoes_trazidas || 0
                                    }
                                />

                                <hr />

                                <InfoLinha
                                    icon={faSackDollar}
                                    label="Total Ofertas"
                                    value={(
                                        dados.totais_classes[itemAtual.id]
                                            .ofertas_total || 0
                                    ).toLocaleString("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                    })}
                                />
                                <InfoLinha
                                    icon={faEarthAfrica}
                                    label="Total Missões"
                                    value={(
                                        dados.totais_classes[itemAtual.id]
                                            .missoes_total || 0
                                    ).toLocaleString("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                    })}
                                />

                                <hr />
                                <InfoLinha
                                    icon={faMoneyBill}
                                    label="Ofertas Dinheiro"
                                    value={(
                                        dados.totais_classes[itemAtual.id]
                                            .ofertas?.dinheiro || 0
                                    ).toLocaleString("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                    })}
                                    isMenor={true}
                                />
                                <InfoLinha
                                    icon={faMoneyBill}
                                    label="Missões Dinheiro"
                                    value={(
                                        dados.totais_classes[itemAtual.id]
                                            .missoes?.dinheiro || 0
                                    ).toLocaleString("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                    })}
                                    isMenor={true}
                                />
                                <InfoLinha
                                    icon={faPix}
                                    label="Ofertas Pix"
                                    value={(
                                        dados.totais_classes[itemAtual.id]
                                            .ofertas?.pix || 0
                                    ).toLocaleString("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                    })}
                                    isMenor={true}
                                />
                                <InfoLinha
                                    icon={faPix}
                                    label="Missões Pix"
                                    value={(
                                        dados.totais_classes[itemAtual.id]
                                            .missoes?.pix || 0
                                    ).toLocaleString("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                    })}
                                    isMenor={true}
                                />
                            </motion.div>
                        )}

                        {isTotais && (
                            <motion.div
                                variants={slideVariants}
                                className="relatorio-card"
                                key={"totais-relatorio-leitura"}
                            >
                                <h3>{itemAtual.nome}</h3>
                                <InfoLinha
                                    icon={faUsers}
                                    label="Total Matriculados"
                                    value={
                                        dados.totais_gerais
                                            .total_matriculados || 0
                                    }
                                />
                                <InfoLinha
                                    icon={faUserCheck}
                                    label="Total Presentes"
                                    value={
                                        dados.totais_gerais.presentes_chamada ||
                                        0
                                    }
                                />
                                <InfoLinha
                                    icon={faUserPlus}
                                    label="Total Visitantes"
                                    value={dados.totais_gerais.visitas || 0}
                                />
                                <InfoLinha
                                    icon={faAlarmClock}
                                    label="Total Atrasados"
                                    value={dados.totais_gerais.atrasados || 0}
                                />
                                <InfoLinha
                                    icon={faGhost}
                                    label="Total Ausentes"
                                    value={
                                        dados.totais_gerais.total_ausentes || 0
                                    }
                                />
                                <hr />
                                <InfoLinha
                                    icon={faListOl}
                                    label="Total de Pessoas"
                                    value={
                                        dados.totais_gerais.total_presentes || 0
                                    }
                                />
                                <hr />
                                <InfoLinha
                                    icon={faBookBible}
                                    label="Total Bíblias"
                                    value={dados.totais_gerais.biblias || 0}
                                />
                                <InfoLinha
                                    icon={faBookOpen}
                                    label="Total Revistas"
                                    value={
                                        dados.totais_gerais.licoes_trazidas || 0
                                    }
                                />
                                <hr />
                                <InfoLinha
                                    icon={faSackDollar}
                                    label="Total Ofertas"
                                    value={(
                                        dados.totais_gerais.ofertas_total || 0
                                    ).toLocaleString("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                    })}
                                />
                                <InfoLinha
                                    icon={faEarthAfrica}
                                    label="Total Missões"
                                    value={(
                                        dados.totais_gerais.missoes_total || 0
                                    ).toLocaleString("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                    })}
                                />

                                <hr />
                                <InfoLinha
                                    icon={faMoneyBill}
                                    label="Ofertas Dinheiro"
                                    value={(
                                        dados.totais_gerais.ofertas_dinheiro ||
                                        0
                                    ).toLocaleString("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                    })}
                                    isMenor={true}
                                />
                                <InfoLinha
                                    icon={faMoneyBill}
                                    label="Missões Dinheiro"
                                    value={(
                                        dados.totais_gerais.missoes_dinheiro ||
                                        0
                                    ).toLocaleString("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                    })}
                                    isMenor={true}
                                />
                                <InfoLinha
                                    icon={faPix}
                                    label="Ofertas Pix"
                                    value={(
                                        dados.totais_gerais.ofertas_pix || 0
                                    ).toLocaleString("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                    })}
                                    isMenor={true}
                                />

                                <InfoLinha
                                    icon={faPix}
                                    label="Missões Pix"
                                    value={(
                                        dados.totais_gerais.missoes_pix || 0
                                    ).toLocaleString("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                    })}
                                    isMenor={true}
                                />
                            </motion.div>
                        )}

                        {isAniversariantes && (
                            <motion.div
                                variants={slideVariants}
                                className="relatorio-card"
                            >
                                <h3>
                                    <FontAwesomeIcon icon={faCakeCandles} />{" "}
                                    {itemAtual.nome}
                                </h3>
                                {dados.aniversariantes.length > 0 ? (
                                    <ul className="aniversariantes-lista">
                                        {dados.aniversariantes.map((aluno) => (
                                            <li key={aluno.id}>
                                                <p>
                                                    <b>
                                                        {aluno.nome_completo}:
                                                    </b>
                                                </p>
                                                <p>
                                                    {
                                                        aluno.data_nascimento as unknown as string
                                                    }
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="sem-aniversariantes">
                                        Nenhum aniversariante esta semana.
                                    </p>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="relatorio-leitura__footer">
                <button
                    onClick={slideAnterior}
                    disabled={indiceAtual === 0}
                    className="nav-btn"
                >
                    <FontAwesomeIcon icon={faArrowLeft} /> Anterior
                </button>

                <div className="progress-indicator">
                    <span className="progress-text">
                        ({indiceAtual + 1} de {filaCompleta.length})
                    </span>
                    <div className="progress-dots">
                        {filaCompleta.map((_, index) => (
                            <div
                                key={index}
                                className={`dot ${
                                    index === indiceAtual ? "dot--ativo" : ""
                                }`}
                                onClick={() => setIndiceAtual(index)}
                            />
                        ))}
                    </div>
                </div>

                <button
                    onClick={proximoSlide}
                    disabled={indiceAtual === filaCompleta.length - 1}
                    className="nav-btn"
                >
                    Próximo <FontAwesomeIcon icon={faArrowRight} />
                </button>
            </div>
        </motion.div>
    );
}

export default RelatorioLeitura;
