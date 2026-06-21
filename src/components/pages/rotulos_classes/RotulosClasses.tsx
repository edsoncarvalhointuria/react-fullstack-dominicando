import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faChalkboard, faPlus, faTag, faThumbsUp, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useDataContext } from "../../../context/DataContext";
import Loading from "../../layout/loading/Loading";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, functions } from "../../../utils/firebase";
import { Navigate, useNavigate } from "react-router-dom";
import SearchInput from "../../ui/SearchInput";
import { useAuthContext } from "../../../context/AuthContext";
import AlertModal from "../../ui/AlertModal";
import { httpsCallable } from "firebase/functions";
import { getOrdem } from "../../../utils/getOrdem";
import TabelaDeGestao from "../../ui/TabelaDeGestao";
import OrderInput from "../../ui/OrderInput";
import CadastroRotuloModal from "../../ui/CadastroRotuloModal";
import ButtonsDefault from "../../ui/ButtonDefault";

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

const deletarRotulo = httpsCallable(functions, "deletarAluno");

function RotulosClasses() {
    const OPTIONS = [
        {
            nome: "Nome",
            id: "nome",
            icon: faChalkboard,
            isFilter: true,
            placeholder: "",
        },
        {
            nome: "Idade Mínima",
            id: "idade_minima",
            icon: faCalendar,
            isFilter: true,
            placeholder: "-",
        },
        {
            nome: "Idade Máxima",
            id: "idade_maxima",
            icon: faCalendar,
            isFilter: true,
            placeholder: "-",
        },
    ];

    const [isLoading, setIsLoading] = useState(false);
    const [editRotulo, setEditRotulo] = useState("");
    const [addRotulo, setAddRotulo] = useState(false);
    const [update, setUpdate] = useState(false);
    const [pesquisa, setPesquisa] = useState("");
    const [ordemColuna, setOrdemColuna] = useState<keyof RotulosClassesInterface>("idade_minima");
    const [ordem, setOrdem] = useState<"crescente" | "decrescente">("crescente");
    const [rotulos, setRotulos] = useState<RotulosClassesInterface[]>([]);
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
    const { isLoadingData } = useDataContext();
    const { user, isSuperAdmin } = useAuthContext();
    const navigate = useNavigate();

    const apagarRotulo = async (rotuloId: string) => {
        setIsLoading(true);
        setMensagem(null);

        try {
            const { data } = await deletarRotulo({ alunoId: rotuloId });
            setMensagem({
                confirmText: "Ok",
                onConfirm: () => setMensagem(null),
                message: (data as any).message,
                title: "Aluno deletado",
                icon: <FontAwesomeIcon icon={faThumbsUp} />,
                cancelText: "Cancelar",
                onCancel: () => setMensagem(null),
                onClose: () => setMensagem(null),
            });
            setUpdate((v) => !v);
        } catch (error: any) {
            console.log("Deu esse erro", error);
            setMensagem({
                confirmText: "Ok",
                onConfirm: () => setMensagem(null),
                message: error.message,
                title: "Erro ao deletar aluno",
                cancelText: "Cancelar",
                onCancel: () => setMensagem(null),
                onClose: () => setMensagem(null),
            });
        } finally {
            setPesquisa("");
            setIsLoading(false);
        }
    };

    const rotulosMemo = useMemo(() => {
        let r = rotulos;
        r = r.filter(
            (v) =>
                v.nome.toLowerCase().includes(pesquisa) ||
                v.idade_minima === Number(pesquisa) ||
                v.idade_maxima === Number(pesquisa),
        );
        r = r.sort((a: any, b: any) => getOrdem(a, b, ordemColuna, ordem));
        return r;
    }, [rotulos, pesquisa, ordem, ordemColuna]);
    useEffect(() => {
        const getRotulosClasses = async () => {
            setIsLoading(true);
            const rotulosCll = collection(db, "rotulos_classes");
            const q = query(rotulosCll, where("ministerioId", "==", user?.ministerioId));
            const rotulosDocs = await getDocs(q);

            if (rotulosDocs.empty) return [];

            const rotulos = rotulosDocs.docs.map((v) => ({
                id: v.id,
                ...v.data(),
            }));

            return rotulos as RotulosClassesInterface[];
        };

        getRotulosClasses()
            .then((r) => {
                setRotulos(r);
            })
            .catch((err) => {
                console.log("deu esse erro", err);
                navigate("/rotulos-classes");
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [update]);
    if (isLoadingData || isLoading) return <Loading />;
    if (!isSuperAdmin.current) return <Navigate to={"/dashboard"} />;
    return (
        <>
            <motion.div
                className="alunos-page"
                variants={variantsContainer}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                <div className="alunos-page__header">
                    <div className="alunos-page__header-infos">
                        <h2 className="alunos-page__header-title">
                            <span>
                                <FontAwesomeIcon icon={faTag} />
                            </span>
                            Rótulos de Classes
                        </h2>

                        <ButtonsDefault mensagem="Cadastrar Novo Rótulo" onClickNew={setAddRotulo} />
                    </div>

                    <div className="alunos-page__header-filtros">
                        <div className="alunos-page__header-filtro">
                            <SearchInput onSearch={setPesquisa} texto="Rótulos" />
                        </div>

                        <OrderInput
                            isCrescente={ordem === "crescente"}
                            onOrder={() => setOrdem((v) => (v === "crescente" ? "decrescente" : "crescente"))}
                            onSelect={(v) => setOrdemColuna(v.id as any)}
                            options={OPTIONS.filter((v) => v.isFilter)}
                        />
                    </div>
                </div>

                <div className="alunos-page__body">
                    <AnimatePresence>
                        {rotulosMemo.length > 0 ? (
                            <TabelaDeGestao
                                currentList={rotulosMemo}
                                currentOrder={ordemColuna}
                                ordem={ordem}
                                options={OPTIONS}
                                onSelectOrder={(v) => {
                                    setOrdemColuna(v.id as any);
                                    setOrdem((v) => (v === "crescente" ? "decrescente" : "crescente"));
                                }}
                                onEdit={(v) => setEditRotulo(v.id)}
                                onDelete={(v) =>
                                    setMensagem({
                                        title: "Deletar Rótulo?",
                                        confirmText: "Sim, rótulo de classe",
                                        message: (
                                            <>
                                                <span>
                                                    Tem certeza que deseja o rótulo: <strong>{v.nome}</strong>?
                                                </span>
                                                <span>
                                                    Todas as classes que utilizam este rótulo terão seu rótulo
                                                    substituído por <strong>OUTRO</strong>
                                                </span>
                                            </>
                                        ),
                                        onConfirm: () => apagarRotulo(v.id),
                                        cancelText: "Cancelar",
                                        onCancel: () => setMensagem(null),
                                        onClose: () => setMensagem(null),
                                        icon: <FontAwesomeIcon icon={faTrash} />,
                                    })
                                }
                            />
                        ) : (
                            <motion.div className="alunos-page__vazio" variants={variantsItem}>
                                <p className="alunos-page__vazio--mensagem">Sem resultados</p>
                                <div className="alunos-page__cadastrar">
                                    <motion.button
                                        onTap={() => setAddRotulo(true)}
                                        whileTap={{ scale: 0.95 }}
                                        className="alunos-page__cadastrar--cadastro"
                                    >
                                        <span>
                                            <FontAwesomeIcon icon={faPlus} />
                                        </span>
                                        Cadastrar Novo Rótulo
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
            <AnimatePresence>
                {(addRotulo || editRotulo) && (
                    <CadastroRotuloModal
                        key={"cadastro-rotulo-modal"}
                        rotuloId={editRotulo}
                        onCancel={() => {
                            setAddRotulo(false);
                            setEditRotulo("");
                        }}
                        onSave={() => {
                            setUpdate((v) => !v);
                        }}
                    />
                )}
            </AnimatePresence>

            <AlertModal isOpen={!!mensagem} {...mensagem!} />
        </>
    );
}

export default RotulosClasses;
