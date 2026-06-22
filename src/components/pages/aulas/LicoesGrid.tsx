import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { LicaoInterface } from "../../../interfaces/LicaoInterface";
import { faCalendarDay, faCaretLeft, faCaretRight, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import LicaoCard from "../../ui/LicaoCard";
import "./licoes-grid.scss";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LicaoModal from "../../ui/LicaoModal";
import SearchInput from "../../ui/SearchInput";
import ModalSkeleton from "../../ui/ModalSkeleton";

const NovoTrimestreModal = lazy(() => import("../../ui/NovoTrimestreModal"));

const TOTAL_ITENS = 6;

function LicoesGrid({
    revistas,
    classeNome,
    classeId,
    igrejaId,
    onUpdate,
    limite,
    onUpdateLimit,
}: {
    revistas: LicaoInterface[];
    classeNome: string;
    classeId: string;
    igrejaId: string;
    onUpdate: () => void;
    onUpdateLimit: () => void;
    limite: number;
}) {
    const [currentLicao, setCurrentLicao] = useState<LicaoInterface | null>(null);
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
                    `${v?.numero_trimestre || 1} trimestre de ${v.data_inicio.toDate().getFullYear()}`.includes(
                        pesquisa,
                    ) ||
                    v.data_inicio.toDate().toLocaleDateString("pt-BR").includes(pesquisa) ||
                    v.data_fim.toDate().toLocaleDateString("pt-BR").includes(pesquisa) ||
                    v.id === pesquisa,
            );

        const indice = (paginaAtual - 1) * TOTAL_ITENS;
        const ultimoIndice = indice + TOTAL_ITENS;
        const totalPaginas = Math.ceil(i.length / TOTAL_ITENS);

        return { lista: i.slice(indice, ultimoIndice), totalPaginas };
    }, [pesquisa, revistas, paginaAtual]);

    const onSelectLicao = useCallback(
        (licaoId: string) => {
            const licao = revistas.find((v) => v.id === licaoId);
            if (!licao) return;

            if (licao.primeiroAcesso) setEditLicao(licao);
            else setCurrentLicao(licao);
        },
        [revistas],
    );

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
                transition={{ duration: 1 }}
            >
                <div className="licoes-grid__header">
                    <div className="licoes-grid__header--title">
                        <h2>
                            Revistas da classe <span>{classeNome}</span>
                        </h2>
                    </div>
                    <div className="licoes-grid__header--controls">
                        <div className="licoes-grid__header--novo-trimestre">
                            <motion.button
                                onTap={() => {
                                    setNewTrimestre(true);
                                    window.history.pushState({ modal: true }, "");
                                }}
                            >
                                <FontAwesomeIcon icon={faCalendarDay} />
                                <span>Iniciar um novo trimestre</span>
                            </motion.button>
                        </div>

                        <SearchInput onSearch={setPesquisa} texto="Ano, Trimestre, Nome" />
                    </div>
                </div>
                <div className="licoes-grid__grid">
                    <AnimatePresence>
                        {itensMemo.lista.length > 0 ? (
                            <>
                                {itensMemo.lista.map((v) => (
                                    <LicaoCard
                                        dataInicio={v.data_inicio.toDate().toLocaleDateString("pt-BR", {
                                            month: "2-digit",
                                            year: "numeric",
                                        })}
                                        isAtivo={v.ativo}
                                        licaoId={v.id}
                                        numeroAulas={v.numero_aulas}
                                        titulo={v.titulo}
                                        trimestre={`${v.numero_trimestre}º Trimestre de ${v.data_inicio.toDate().getFullYear()}`}
                                        img={v.img}
                                        totalMatriculados={v.total_matriculados}
                                        onClick={onSelectLicao}
                                        key={v.id}
                                    />
                                ))}

                                {revistas.length >= limite && (
                                    <motion.button className="licao-card__more" onTap={onUpdateLimit}>
                                        <p>Clique aqui para carregar lições mais antigas.</p>
                                        <i>
                                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                                        </i>
                                    </motion.button>
                                )}
                            </>
                        ) : (
                            <motion.div
                                className="licoes-grid__vazia"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <p>Nenhuma lição encontrada</p>

                                <div className="licoes-grid__header--novo-trimestre">
                                    <button onClick={() => setNewTrimestre(true)}>
                                        <FontAwesomeIcon icon={faCalendarDay} />
                                        <span>Iniciar um novo trimestre</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {itensMemo.totalPaginas > 1 && (
                    <div className="licoes-grid__paginacao">
                        <motion.button onTap={() => setPaginaAtual((p) => p - 1)} disabled={paginaAtual === 1}>
                            <FontAwesomeIcon icon={faCaretLeft} />
                        </motion.button>
                        <span>
                            {paginaAtual} de {itensMemo.totalPaginas}
                        </span>
                        <motion.button
                            onTap={() => setPaginaAtual((p) => p + 1)}
                            disabled={paginaAtual >= itensMemo.totalPaginas}
                        >
                            <FontAwesomeIcon icon={faCaretRight} />
                        </motion.button>
                    </div>
                )}
                <Suspense fallback={<ModalSkeleton />}>
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
                </Suspense>
                {currentLicao && (
                    <LicaoModal licao={currentLicao} closeModal={setCurrentLicao} editLicao={setEditLicao} />
                )}
            </motion.div>
        </AnimatePresence>
    );
}

export default LicoesGrid;
