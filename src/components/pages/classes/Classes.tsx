import { Navigate } from "react-router-dom";
import { useAuthContext } from "../../../context/AuthContext";
import { useDataContext } from "../../../context/DataContext";
import Loading from "../../layout/loading/Loading";
import { useEffect, useMemo, useState } from "react";
import {
    faChurch,
    faFeather,
    faNetworkWired,
    faPlus,
    faThumbsUp,
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
    const { isSecretario, isSuperAdmin } = useAuthContext();
    const { isLoadingData, igrejas, classes, refetchData } = useDataContext();
    const [currentIgreja, setCurrentIgreja] = useState<IgrejaInterface | null>(
        null
    );
    const [isLoading, setIsLoading] = useState(false);
    const [addClasse, setAddClasse] = useState(false);
    const [editClasse, setEditClasse] = useState("");
    const [delClasse, setDelClasse] = useState<ClasseInterface | null>(null);
    const [pesquisa, setPesquisa] = useState("");
    const [ordemColuna, setOrdemColuna] = useState<"nome" | "igrejaNome">(
        "nome"
    );
    const [ordem, setOrdem] = useState<"crescente" | "decrescente">(
        "crescente"
    );
    const [message, setMessage] = useState<{
        title: string;
        message: string;
        icon?: any;
    } | null>(null);

    const apagarClasse = async (classeId: string) => {
        setIsLoading(true);
        setDelClasse(null);

        try {
            const { data } = await deletarClasse({ classeId });
            setMessage({
                message: (data as any).message,
                title: "Sucesso",
                icon: <FontAwesomeIcon icon={faThumbsUp} />,
            });
            refetchData();
        } catch (err: any) {
            console.log("deu esse erro", err);
            setMessage({ message: err.message, title: "Erro ao deletar" });
        } finally {
            setIsLoading(false);
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
                            <p>Total de classe ({classesMemo.length})</p>
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
                                onDelete={(v) => {
                                    setDelClasse(v);
                                }}
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

                <AlertModal
                    key={"deletar-classe"}
                    isOpen={!!delClasse}
                    message={
                        <>
                            <span>
                                Tem certeza que deseja deletar a classe:{" "}
                                {delClasse?.nome}?
                            </span>
                            <span>
                                Isso irá deletar <strong>TODOS</strong> os
                                usuários associados a ela.
                            </span>
                        </>
                    }
                    onCancel={() => setDelClasse(null)}
                    onClose={() => setDelClasse(null)}
                    onConfirm={() => apagarClasse(delClasse?.id || "")}
                    title="Deseja deletar a classe?"
                    cancelText="Cancelar"
                    confirmText="Sim, deletar classe"
                />
                <AlertModal
                    key={"erro-ao-apagar"}
                    isOpen={!!message}
                    message={message?.message}
                    onCancel={() => {
                        setMessage(null);
                        refetchData();
                    }}
                    onClose={() => {
                        setMessage(null);
                        refetchData();
                    }}
                    onConfirm={() => {
                        setMessage(null);
                        refetchData();
                    }}
                    title={message?.title || ""}
                    cancelText="Cancelar"
                    confirmText="Ok"
                    icon={message?.icon}
                />
            </AnimatePresence>
        </>
    );
}

export default Classes;
