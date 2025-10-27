import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./igrejas.scss";
import {
    faFeather,
    faFileCsv,
    faPlus,
    faThumbsUp,
} from "@fortawesome/free-solid-svg-icons";
import SearchInput from "../../ui/SearchInput";
import { useAuthContext } from "../../../context/AuthContext";
import { useDataContext } from "../../../context/DataContext";
import Loading from "../../layout/loading/Loading";
import { useMemo, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import CadastroIgrejaModal from "../../ui/CadastroIgrejaModal";
import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import AlertModal from "../../ui/AlertModal";
import { getFunctions, httpsCallable } from "firebase/functions";
import TabelaDeGestao from "../../ui/TabelaDeGestao";
import { getOrdem } from "../../../utils/getOrdem";
import OrderInput from "../../ui/OrderInput";
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
const deletarIgreja = httpsCallable(functions, "deletarIgreja");
const salvarIgrejaCSV = httpsCallable(functions, "salvarIgrejaCSV");

function Igrejas() {
    const OPTIONS = [
        {
            nome: "Nome",
            id: "nome",
            icon: faFeather,
            isFilter: true,
            placeholder: "",
        },
    ];
    const COLUNAS = ["nome"];
    const { isSuperAdmin } = useAuthContext();
    const { igrejas, isLoadingData, refetchData } = useDataContext();
    const [editIgreja, setEditIgreja] = useState("");
    const [addIgreja, setAddIgreja] = useState(false);
    const [importCSV, setImportCSV] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [ordemColuna, setOrdemColuna] = useState("");
    const [pesquisa, setPesquisa] = useState("");
    const [ordem, setOrdem] = useState<"crescente" | "decrescente">(
        "crescente"
    );
    const [mensagem, setMensagem] = useState<{
        mensagem: string | ReactNode;
        titulo: string;
        confirmText: string;
        onCancel: () => void;
        onConfirm: () => void;
        icon?: any;
    } | null>(null);

    const apagarIgreja = async (igrejaId: string) => {
        setMensagem(null);
        setIsLoading(true);
        try {
            const { data } = await deletarIgreja({ igrejaId });
            setMensagem({
                mensagem: (data as any).message,
                titulo: "Sucesso ao deletar",
                confirmText: "Ok",
                onCancel: () => setMensagem(null),
                onConfirm: () => setMensagem(null),
                icon: <FontAwesomeIcon icon={faThumbsUp} />,
            });
            refetchData();
        } catch (error: any) {
            console.log("deu esse erro", error);
            setMensagem({
                mensagem: error.message,
                titulo: "Erro ao deletar",
                confirmText: "Ok",
                onCancel: () => setMensagem(null),
                onConfirm: () => setMensagem(null),
            });
        } finally {
            setIsLoading(false);
            setPesquisa("");
        }
    };

    const igrejasMemo = useMemo(() => {
        let i = igrejas;
        i = i.filter(
            (v) =>
                v.nome.toLowerCase().includes(pesquisa) ||
                v.id.toLowerCase() === pesquisa
        );
        i = i.sort((a: any, b: any) => getOrdem(a, b, ordemColuna, ordem));

        return i;
    }, [igrejas, pesquisa, ordem, ordemColuna]);
    if (!isLoadingData && !isSuperAdmin.current)
        return <Navigate to={"/dashboard"} />;
    if (isLoadingData || isLoading) return <Loading />;
    return (
        <>
            <motion.div
                className="igrejas-page"
                variants={variantsContainer}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                <div className="igrejas-page__head">
                    <div className="igrejas-page__infos">
                        <div className="igrejas-page__title">
                            <h2>Gestão de Igrejas</h2>
                        </div>
                        <div className="igrejas-page__buttons">
                            <button
                                title="Cadastrar nova igreja"
                                onClick={() => setAddIgreja(true)}
                                className="igrejas-page__buttons--cadastro"
                            >
                                <span>
                                    <FontAwesomeIcon icon={faPlus} />
                                </span>
                                Cadastrar nova igreja
                            </button>

                            <button
                                title="Importar CSV"
                                className="igrejas-page__buttons--csv"
                                onClick={() => setImportCSV(true)}
                            >
                                <span>
                                    <FontAwesomeIcon icon={faFileCsv} />
                                </span>
                                Importar CSV
                            </button>
                        </div>
                    </div>
                    <div className="igrejas-page__filtros">
                        <SearchInput
                            texto="Igreja"
                            onSearch={(texto) => setPesquisa(texto)}
                        />
                        <OrderInput
                            isCrescente={ordem === "crescente"}
                            onOrder={() =>
                                setOrdem((v) =>
                                    v === "crescente"
                                        ? "decrescente"
                                        : "crescente"
                                )
                            }
                            onSelect={(v) => setOrdemColuna(v.id)}
                            options={OPTIONS.filter((v) => v.isFilter)}
                        />
                        <div className="igrejas-page__filtros-qtd">
                            <p>Total de igrejas: ({igrejasMemo.length})</p>
                        </div>
                    </div>
                </div>
                <div className="igrejas-page__body">
                    {igrejasMemo.length > 0 ? (
                        <TabelaDeGestao
                            currentList={igrejasMemo}
                            currentOrder={ordemColuna}
                            ordem={ordem}
                            options={OPTIONS}
                            onSelectOrder={(v) => {
                                setOrdemColuna(v.id);
                                setOrdem((v) =>
                                    v === "crescente"
                                        ? "decrescente"
                                        : "crescente"
                                );
                            }}
                            onEdit={(v) => setEditIgreja(v.id)}
                            onDelete={(v) =>
                                setMensagem({
                                    mensagem: (
                                        <>
                                            <span>
                                                Tem certeza que deseja deletar a
                                                igreja:{" "}
                                                <strong>{v.nome}</strong>?
                                            </span>
                                            <span>
                                                Isso irá apagar{" "}
                                                <strong>TODOS</strong> os dados
                                                relacionados a ela.
                                            </span>
                                        </>
                                    ),
                                    titulo: "Deletar igreja?",
                                    confirmText: "Sim, deletar igreja",
                                    onCancel: () => setMensagem(null),
                                    onConfirm: () => apagarIgreja(v.id),
                                })
                            }
                        />
                    ) : (
                        <motion.div
                            className="igrejas-page__vazio"
                            variants={variantsItem}
                        >
                            <p className="igrejas-page__vazio--mensagem">
                                Sem resultados
                            </p>
                            <div className="igrejas-page__button">
                                <button
                                    title="Cadastrar nova igreja"
                                    onClick={() => setAddIgreja(true)}
                                >
                                    <span>
                                        <FontAwesomeIcon icon={faPlus} />
                                    </span>
                                    Cadastrar nova igreja
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
            <AnimatePresence>
                {(addIgreja || editIgreja) && (
                    <CadastroIgrejaModal
                        igrejaId={editIgreja}
                        onCancel={() => {
                            setAddIgreja(false);
                            setEditIgreja("");
                        }}
                        onSave={() => {
                            refetchData();
                            setEditIgreja("");
                        }}
                    />
                )}

                {importCSV && (
                    <ImportarCSVModal
                        key={"importar-csv-modal"}
                        onCancel={() => setImportCSV(false)}
                        listaColunas={COLUNAS}
                        firebaseFunction={salvarIgrejaCSV}
                        onSave={refetchData}
                    />
                )}

                <AlertModal
                    key={"alert-modal-igrejas"}
                    isOpen={!!mensagem}
                    message={mensagem?.mensagem}
                    onCancel={() => mensagem?.onCancel()}
                    onClose={() => mensagem?.onCancel()}
                    onConfirm={() => mensagem?.onConfirm()}
                    title={mensagem?.titulo || ""}
                    confirmText={mensagem?.confirmText}
                    icon={mensagem?.icon}
                />
            </AnimatePresence>
        </>
    );
}

export default Igrejas;
