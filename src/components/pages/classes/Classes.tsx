import { Navigate } from "react-router-dom";
import { useAuthContext } from "../../../context/AuthContext";
import { useDataContext } from "../../../context/DataContext";
import Loading from "../../layout/loading/Loading";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
    faChurch,
    faFeather,
    faFileCsv,
    faNetworkWired,
    faPlus,
    faThumbsUp,
    faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Dropdown from "../../ui/Dropdown";
import SearchInput from "../../ui/SearchInput";
import "./classes.scss";
import CadastroClasseModal from "../../ui/CadastroClasseModal";
import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import AlertModal from "../../ui/AlertModal";
import { getFunctions, httpsCallable } from "firebase/functions";
import OrderInput from "../../ui/OrderInput";
import TabelaDeGestao from "../../ui/TabelaDeGestao";
import { getOrdem } from "../../../utils/getOrdem";
import ImportarCSVModal from "../../ui/ImportarCSVModal";

const variantsItem: Variants = {
    hidden: { y: -10, opacity: 0 },
    visible: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 },
};

const variantsContainer: Variants = {
    hidden: {},
    visible: { transition: { delayChildren: stagger(0.1) } },
    exit: {},
};

const functions = getFunctions();
const deletarClasse = httpsCallable(functions, "deletarClasse");
const salvarClasseCSV = httpsCallable(functions, "salvarClasseCSV");

function Classes() {
    const OPTIONS = [
        {
            nome: "Nome",
            id: "nome",
            icon: faFeather,
            isFilter: true,
            placeholder: "",
        },
        {
            nome: "Idade mínima",
            id: "idade_minima",
            icon: faNetworkWired,
            isFilter: true,
            placeholder: "-",
        },
        {
            nome: "Idade máxima",
            id: "idade_maxima",
            icon: faNetworkWired,
            isFilter: true,
            placeholder: "-",
        },
        {
            nome: "Igreja",
            id: "igrejaNome",
            icon: faChurch,
            isFilter: true,
            placeholder: "",
        },
    ];
    const COLUNAS = [
        "nome",
        "idade_minima(opcional)",
        "idade_maxima(opcional)",
    ];
    const { isSecretario, isSuperAdmin } = useAuthContext();
    const { isLoadingData, igrejas, classes, refetchData } = useDataContext();
    const [currentIgreja, setCurrentIgreja] = useState<IgrejaInterface | null>(
        null
    );
    const [isLoading, setIsLoading] = useState(false);
    const [addClasse, setAddClasse] = useState(false);
    const [importCSV, setImportCSV] = useState(false);
    const [editClasse, setEditClasse] = useState("");
    const [pesquisa, setPesquisa] = useState("");
    const [ordemColuna, setOrdemColuna] = useState<"nome" | "igrejaNome">(
        "nome"
    );
    const [ordem, setOrdem] = useState<"crescente" | "decrescente">(
        "crescente"
    );
    const [mensagem, setMensagem] = useState<{
        message: string | ReactNode;
        title: string;
        confirmText: string;
        cancelText: string;
        onCancel: () => void;
        onClose: () => void;
        onConfirm: () => void;
        icon?: any;
    } | null>(null);

    const apagarClasse = async (classeId: string) => {
        setIsLoading(true);
        setMensagem(null);

        try {
            const { data } = await deletarClasse({ classeId });
            setMensagem({
                message: (data as any).message,
                title: "Sucesso",
                onCancel: () => {
                    setMensagem(null);
                    refetchData();
                },
                onClose: () => {
                    setMensagem(null);
                    refetchData();
                },
                onConfirm: () => {
                    setMensagem(null);
                    refetchData();
                },
                cancelText: "Cancelar",
                confirmText: "Ok",
                icon: <FontAwesomeIcon icon={faThumbsUp} />,
            });
            refetchData();
        } catch (error: any) {
            console.log("deu esse erro", error);
            setMensagem({
                title: "Erro ao salvar lição",
                message: error.message,
                onClose: () => setMensagem(null),
                onConfirm: () => setMensagem(null),
                onCancel: () => setMensagem(null),
                cancelText: "Cancelar",
                confirmText: "Ok",
                icon: <FontAwesomeIcon icon={faTriangleExclamation} />,
            });
        } finally {
            setIsLoading(false);
            setPesquisa("");
        }
    };

    const classesMemo = useMemo(() => {
        let c = classes;

        if (currentIgreja) c = c.filter((v) => v.igrejaId === currentIgreja.id);
        if (pesquisa)
            c = c.filter(
                (v) =>
                    v.nome.toLowerCase().includes(pesquisa) ||
                    v.igrejaNome.toLowerCase().includes(pesquisa) ||
                    v.id.toLowerCase() === pesquisa
            );
        return c.sort((a, b) => getOrdem(a, b, ordemColuna, ordem));
    }, [pesquisa, classes, currentIgreja, ordemColuna, ordem]);

    useEffect(() => {
        if (!isSuperAdmin.current && igrejas.length)
            setCurrentIgreja(igrejas[0]);
    }, [igrejas]);
    if (!isLoadingData && isSecretario.current)
        return <Navigate to="/dashboard" />;
    if (isLoadingData || isLoading) return <Loading />;
    return (
        <>
            <motion.div
                className="classes-page"
                variants={variantsContainer}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                <div className="classes-page__header">
                    <div className="classes-page__infos">
                        <div className="classes-page__title">
                            <h2>Gestão de Classes</h2>
                        </div>

                        <div className="classes-page__cadastrar">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onTap={() => setAddClasse(true)}
                                title="Cadastrar nova classe"
                                className="classes-page__cadastrar--cadastro"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                                Cadastrar nova classe
                            </motion.button>
                            {!isSecretario.current && (
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onTap={() => setImportCSV(true)}
                                    title="Cadastrar nova classe"
                                    className="classes-page__cadastrar--csv"
                                >
                                    <FontAwesomeIcon icon={faFileCsv} />
                                    Importar CSV
                                </motion.button>
                            )}
                        </div>
                    </div>

                    <div className="classes-page__filtros">
                        <div className="classes-page__filtro">
                            <p>Igreja:</p>
                            <Dropdown
                                current={currentIgreja?.nome || null}
                                lista={igrejas}
                                onSelect={(v) => setCurrentIgreja(v)}
                                selectId={currentIgreja?.id}
                                isAll={isSuperAdmin.current}
                            />
                        </div>

                        <div className="classes-page__filtro">
                            <SearchInput
                                texto="classe"
                                onSearch={(v) => setPesquisa(v)}
                            />
                        </div>

                        <OrderInput
                            isCrescente={ordem === "crescente"}
                            onOrder={() =>
                                setOrdem((v) =>
                                    v === "crescente"
                                        ? "decrescente"
                                        : "crescente"
                                )
                            }
                            onSelect={(v) => setOrdemColuna(v.id as any)}
                            options={OPTIONS.filter((v) => v.isFilter)}
                        />

                        <div className="classes-page__total">
                            <p>Total de classes ({classesMemo.length})</p>
                        </div>
                    </div>
                </div>

                <div className="classes-page__body">
                    <AnimatePresence>
                        {classesMemo.length > 0 ? (
                            <TabelaDeGestao
                                currentList={classesMemo as any}
                                currentOrder={ordemColuna}
                                options={OPTIONS}
                                ordem={ordem}
                                onDelete={(v) =>
                                    setMensagem({
                                        message: (
                                            <>
                                                <span>
                                                    Tem certeza que deseja
                                                    deletar a classe: {v?.nome}?
                                                </span>
                                                <span>
                                                    Isso irá deletar{" "}
                                                    <strong>TODOS</strong> os
                                                    usuários associados a ela.
                                                </span>
                                            </>
                                        ),
                                        onCancel: () => setMensagem(null),
                                        onClose: () => setMensagem(null),
                                        onConfirm: () =>
                                            apagarClasse(v?.id || ""),
                                        title: "Deseja deletar a classe?",
                                        cancelText: "Cancelar",
                                        confirmText: "Sim, deletar classe",
                                    })
                                }
                                onEdit={(v) => {
                                    setEditClasse(v.id);
                                }}
                                onSelectOrder={(v) => {
                                    setOrdemColuna(v.id as any);
                                    setOrdem((v) =>
                                        v === "crescente"
                                            ? "decrescente"
                                            : "crescente"
                                    );
                                }}
                            />
                        ) : (
                            <motion.div
                                className="classes-page__vazio"
                                variants={variantsItem}
                            >
                                <p className="classes-page__vazio--mensagem">
                                    Sem resultados
                                </p>
                                <motion.div
                                    className="classes-page__cadastrar"
                                    whileTap={{ scale: 0.85 }}
                                    onTap={() => setAddClasse(true)}
                                >
                                    <button title="Cadastrar nova classe">
                                        <FontAwesomeIcon icon={faPlus} />
                                        Cadastrar nova classe
                                    </button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
            <AnimatePresence>
                {(editClasse || addClasse) && (
                    <CadastroClasseModal
                        key={"cadastro-classe-modal"}
                        classeId={editClasse}
                        onSelect={() => {
                            refetchData();
                        }}
                        onCancel={() => {
                            setEditClasse("");
                            setAddClasse(false);
                        }}
                        igrejaId={currentIgreja?.id || undefined}
                    />
                )}

                {importCSV && (
                    <ImportarCSVModal
                        key={"importar-csv-modal"}
                        listaColunas={COLUNAS}
                        onCancel={() => setImportCSV(false)}
                        igreja
                        onSave={() => refetchData()}
                        firebaseFunction={salvarClasseCSV}
                    />
                )}
            </AnimatePresence>
            <AlertModal isOpen={!!mensagem} {...mensagem!} />
        </>
    );
}

export default Classes;
