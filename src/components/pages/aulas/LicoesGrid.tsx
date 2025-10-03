import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { LicaoInterface } from "../../../interfaces/LicaoInterface";
import {
    faCalendarDay,
    faCaretLeft,
    faCaretRight,
} from "@fortawesome/free-solid-svg-icons";
import LicaoCard from "../../ui/LicaoCard";
import "./licoes-grid.scss";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LicaoModal from "../../ui/LicaoModal";
import NovoTrimestreModal from "../../ui/NovoTrimestreModal";
import SearchInput from "../../ui/SearchInput";

function LicoesGrid({
    revistas,
    classeNome,
    classeId,
    igrejaId,
    onUpdate,
}: {
    revistas: LicaoInterface[];
    classeNome: string;
    classeId: string;
    igrejaId: string;
    onUpdate: () => void;
}) {
    const TOTAL_ITENS = 6;
    const [itens, setItens] = useState(revistas);
    const [currentLicao, setCurrentLicao] = useState<LicaoInterface | null>(
        null
    );
    const [newTrimestre, setNewTrimestre] = useState(false);
    const [editLicao, setEditLicao] = useState<LicaoInterface | null>(null);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPaginados = useMemo(() => {
        const indice = (paginaAtual - 1) * TOTAL_ITENS;
        const ultimoIndice = indice + TOTAL_ITENS;
        return itens.slice(indice, ultimoIndice);
    }, [itens, paginaAtual]);

    const totalPaginas = Math.ceil(itens.length / TOTAL_ITENS);
    return (
        <AnimatePresence>
            <motion.div
                className="licoes-grid"
                key="licoes-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="licoes-grid__header">
                    <div className="licoes-grid__header--title">
                        <h2>Revistas da classe {classeNome}</h2>
                    </div>
                    <div className="licoes-grid__header--controls">
                        <div className="licoes-grid__header--novo-trimestre">
                            <button onClick={() => setNewTrimestre(true)}>
                                <FontAwesomeIcon icon={faCalendarDay} />
                                <span>Iniciar um novo trimestre</span>
                            </button>
                        </div>

                        <SearchInput
                            onSearch={(texto: string) => {
                                setItens(
                                    revistas.filter(
                                        (v) =>
                                            v.titulo
                                                .toLocaleLowerCase()
                                                .includes(
                                                    texto.toLocaleLowerCase()
                                                ) ||
                                            `${
                                                v?.numero_trimestre || 1
                                            } trimestre de ${v.data_inicio
                                                .toDate()
                                                .toLocaleDateString("pt-BR", {
                                                    year: "numeric",
                                                })}`.includes(texto) ||
                                            v.data_inicio
                                                .toDate()
                                                .toLocaleDateString("pt-BR")
                                                .includes(texto) ||
                                            v.data_fim
                                                .toDate()
                                                .toLocaleDateString("pt-BR")
                                                .includes(texto) ||
                                            v.id === texto
                                    )
                                );
                            }}
                            texto="Revista"
                        />
                    </div>
                </div>
                <div className="licoes-grid__grid">
                    <AnimatePresence>
                        {itensPaginados.length > 0 ? (
                            itensPaginados.map((v) => (
                                <LicaoCard
                                    licao={v}
                                    key={v.id}
                                    openModal={setCurrentLicao}
                                />
                            ))
                        ) : (
                            <motion.div
                                className="licoes-grid__vazia"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <p>Nenhuma lição encontrada</p>

                                <div className="licoes-grid__header--novo-trimestre">
                                    <button
                                        onClick={() => setNewTrimestre(true)}
                                    >
                                        <FontAwesomeIcon icon={faCalendarDay} />
                                        <span>Iniciar um novo trimestre</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {totalPaginas > 1 && (
                    <div className="licoes-grid__paginacao">
                        <button
                            onClick={() => setPaginaAtual((p) => p - 1)}
                            disabled={paginaAtual === 1}
                        >
                            <FontAwesomeIcon icon={faCaretLeft} />
                        </button>
                        <span>
                            {paginaAtual} de {totalPaginas}
                        </span>
                        <button
                            onClick={() => setPaginaAtual((p) => p + 1)}
                            disabled={paginaAtual >= totalPaginas}
                        >
                            <FontAwesomeIcon icon={faCaretRight} />
                        </button>
                    </div>
                )}
                <AnimatePresence>
                    {(editLicao || newTrimestre) && (
                        <NovoTrimestreModal
                            key={"novo-trimestre"}
                            classeId={classeId}
                            onClose={() => {
                                setNewTrimestre(false);
                                setEditLicao(null);
                            }}
                            onSave={() => onUpdate()}
                            igrejaId={igrejaId}
                            licaoReference={editLicao}
                        />
                    )}
                </AnimatePresence>
                {currentLicao && (
                    <LicaoModal
                        licao={currentLicao}
                        closeModal={setCurrentLicao}
                        editLicao={setEditLicao}
                    />
                )}
            </motion.div>
        </AnimatePresence>
    );
}

export default LicoesGrid;
