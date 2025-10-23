import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { LicaoInterface } from "../../../interfaces/LicaoInterface";
import {
    faCalendarDay,
    faCaretLeft,
    faCaretRight,
} from "@fortawesome/free-solid-svg-icons";
import LicaoCard from "../../ui/LicaoCard";
import "./licoes-grid.scss";
import { useEffect, useMemo, useState } from "react";
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
    const [currentLicao, setCurrentLicao] = useState<LicaoInterface | null>(
        null
    );
    const [newTrimestre, setNewTrimestre] = useState(false);
    const [editLicao, setEditLicao] = useState<LicaoInterface | null>(null);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [pesquisa, setPesquisa] = useState("");
    const itensMemo = useMemo(() => {
        let i = revistas;
        if (pesquisa)
            i = i.filter(
                (v) =>
                    v.titulo.toLocaleLowerCase().includes(pesquisa) ||
                    `${v?.numero_trimestre || 1} trimestre de ${v.data_inicio
                        .toDate()
                        .getFullYear()}`.includes(pesquisa) ||
                    v.data_inicio
                        .toDate()
                        .toLocaleDateString("pt-BR")
                        .includes(pesquisa) ||
                    v.data_fim
                        .toDate()
                        .toLocaleDateString("pt-BR")
                        .includes(pesquisa) ||
                    v.id === pesquisa
            );

        return i;
    }, [pesquisa]);
    const itensPaginados = useMemo(() => {
        const indice = (paginaAtual - 1) * TOTAL_ITENS;
        const ultimoIndice = indice + TOTAL_ITENS;
        return itensMemo.slice(indice, ultimoIndice);
    }, [itensMemo, paginaAtual]);

    const totalPaginas = Math.ceil(itensMemo.length / TOTAL_ITENS);
    useEffect(() => {
        const popstate = () => {
            setNewTrimestre(false);
            setCurrentLicao(null);
        };
        window.addEventListener("popstate", popstate);

        return () => window.removeEventListener("popstate", popstate);
    }, []);
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
                            <motion.button
                                onTap={() => {
                                    setNewTrimestre(true);
                                    window.history.pushState(
                                        { modal: true },
                                        ""
                                    );
                                }}
                            >
                                <FontAwesomeIcon icon={faCalendarDay} />
                                <span>Iniciar um novo trimestre</span>
                            </motion.button>
                        </div>

                        <SearchInput
                            onSearch={(texto: string) => setPesquisa(texto)}
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
