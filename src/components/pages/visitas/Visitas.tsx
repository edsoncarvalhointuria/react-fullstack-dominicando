import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCalendar,
    faCalendarWeek,
    faFeather,
    faPhone,
    faPlus,
    faThumbsUp,
} from "@fortawesome/free-solid-svg-icons";
import Dropdown from "../../ui/Dropdown";
import { useDataContext } from "../../../context/DataContext";
import Loading from "../../layout/loading/Loading";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import "./visitas.scss";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../utils/firebase";
import { useNavigate } from "react-router-dom";
import SearchInput from "../../ui/SearchInput";
import CadastroAlunoModal from "../../ui/CadastroAlunoModal";
import { useAuthContext } from "../../../context/AuthContext";
import AlertModal from "../../ui/AlertModal";
import { getFunctions, httpsCallable } from "firebase/functions";
import type { VisitanteInterface } from "../../../interfaces/VisitantesInterface";
import { getOrdem } from "../../../utils/getOrdem";
import TabelaDeGestao from "../../ui/TabelaDeGestao";
import OrderInput from "../../ui/OrderInput";

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
const deletarVisita = httpsCallable(functions, "deletarVisita");
const salvarVisita = httpsCallable(functions, "salvarVisita");

function Visitas() {
    const OPTIONS = [
        {
            nome: "Nome",
            id: "nome_completo",
            icon: faFeather,
            isFilter: true,
            placeholder: "",
        },
        {
            nome: "Data Nasc.",
            id: "data_nascimento",
            icon: faCalendar,
            isFilter: true,
            placeholder: "sem data",
            dataObject: {},
        },
        {
            nome: "Contato",
            id: "contato",
            icon: faPhone,
            isFilter: false,
            placeholder: "sem contato",
        },
        {
            nome: "Primeira Visita",
            id: "primeira_visita",
            icon: faCalendarWeek,
            isFilter: true,
            placeholder: "",
            dataObject: {},
        },
        {
            nome: "Última Visita",
            id: "ultima_visita",
            icon: faCalendarWeek,
            isFilter: true,
            placeholder: "",
            dataObject: {},
        },
    ];
    const [isLoading, setIsLoading] = useState(false);
    const [editVisita, setEditVisita] = useState("");
    const [pesquisa, setPesquisa] = useState("");
    const [addVisita, setAddVisita] = useState(false);
    const [currentIgreja, setCurrentIgreja] = useState<IgrejaInterface | null>(
        null
    );
    const [visitas, setVisitas] = useState<VisitanteInterface[]>([]);
    const [update, setUpdate] = useState(false);
    const [ordemColuna, setOrdemColuna] =
        useState<keyof VisitanteInterface>("nome_completo");
    const [ordem, setOrdem] = useState<"crescente" | "decrescente">(
        "crescente"
    );
    const [mensagem, setMensagem] = useState<{
        titulo: string;
        mensagem: string | ReactNode;
        onConfirm: () => void;
        confirmText: string;
        icon?: any;
    } | null>(null);
    const { isLoadingData, igrejas } = useDataContext();
    const { user, isSuperAdmin } = useAuthContext();
    const navigate = useNavigate();

    const apagarVisita = async (visitaId: string) => {
        setIsLoading(true);
        setMensagem(null);

        try {
            const { data } = await deletarVisita({ visitaId });
            setMensagem({
                confirmText: "Ok",
                onConfirm: () => setMensagem(null),
                mensagem: (data as any).message,
                titulo: "Visita deletada",
                icon: <FontAwesomeIcon icon={faThumbsUp} />,
            });
            setUpdate((v) => !v);
        } catch (error: any) {
            console.log("Deu esse erro", error);
            setMensagem({
                confirmText: "Ok",
                onConfirm: () => setMensagem(null),
                mensagem: error.message,
                titulo: "Erro ao deletar visita",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const visitasMemo = useMemo(() => {
        let v = visitas;
        v = v.filter(
            (v) =>
                v.igrejaNome.toLowerCase().includes(pesquisa) ||
                v.nome_completo.toLowerCase().includes(pesquisa) ||
                v.data_nascimento
                    ?.toDate()
                    ?.toLocaleDateString("pt-BR")
                    ?.includes(pesquisa) ||
                v.primeira_visita
                    ?.toDate()
                    ?.toLocaleDateString("pt-BR")
                    ?.includes(pesquisa) ||
                v.ultima_visita
                    ?.toDate()
                    ?.toLocaleDateString("pt-BR")
                    ?.includes(pesquisa)
        );
        v = v.sort((a: any, b: any) => getOrdem(a, b, ordemColuna, ordem));

        return v;
    }, [visitas, ordem, ordemColuna, pesquisa]);
    useEffect(() => {
        const getVisitas = async (igrejaId: string) => {
            const visitasCll = collection(db, "visitantes");
            const q = query(
                visitasCll,
                where("igrejaId", "==", igrejaId),
                where("ministerioId", "==", user?.ministerioId)
            );
            const visitasSnap = await getDocs(q);

            if (visitasSnap.empty) return [];

            const visitas = visitasSnap.docs.map((v) => ({
                id: v.id,
                ...v.data(),
            })) as VisitanteInterface[];

            return visitas.sort((a, b) =>
                a.nome_completo.localeCompare(b.nome_completo)
            );
        };
        if (currentIgreja)
            getVisitas(currentIgreja.id)
                .then((v) => {
                    setVisitas(v);
                })
                .catch((err) => {
                    console.log("deu esse erro", err);
                    navigate("/visitas");
                })
                .finally(() => {
                    setIsLoading(false);
                });
    }, [currentIgreja, update]);
    useEffect(() => {
        if (igrejas.length && !isSuperAdmin.current)
            setCurrentIgreja(igrejas[0]);
    }, [igrejas]);
    if (isLoadingData || isLoading) return <Loading />;
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
                            Gestão de Visitas
                        </h2>
                        <motion.div
                            className="alunos-page__cadastrar"
                            whileTap={{ scale: 0.85 }}
                        >
                            <button
                                onClick={() => setAddVisita(true)}
                                disabled={!currentIgreja}
                            >
                                <span>
                                    <FontAwesomeIcon icon={faPlus} />
                                </span>
                                Cadastrar nova visita
                            </button>
                        </motion.div>
                    </div>

                    <div className="alunos-page__header-filtros">
                        <div className="alunos-page__header-filtro">
                            <p>Igreja:</p>
                            <Dropdown
                                lista={igrejas}
                                current={currentIgreja?.nome || null}
                                onSelect={(v) => setCurrentIgreja(v)}
                                isAll={false}
                                selectId={currentIgreja?.id}
                            />
                        </div>

                        <div className="alunos-page__header-filtro">
                            <SearchInput
                                onSearch={(texto) => setPesquisa(texto)}
                                texto="visitas"
                            />
                        </div>
                        <OrderInput
                            onOrder={() =>
                                setOrdem((v) =>
                                    v === "crescente"
                                        ? "decrescente"
                                        : "crescente"
                                )
                            }
                            isCrescente={ordem === "crescente"}
                            options={OPTIONS.filter((v) => v.isFilter)}
                            onSelect={(v) => setOrdemColuna(v.id as any)}
                        />

                        <div className="alunos-page__header-qtd">
                            <p>Total de Visitas: ({visitasMemo.length})</p>
                        </div>
                    </div>
                </div>
                <div className="alunos-page__body">
                    <AnimatePresence>
                        {visitasMemo.length > 0 ? (
                            <TabelaDeGestao
                                currentList={visitasMemo}
                                options={OPTIONS}
                                currentOrder={ordemColuna}
                                ordem={ordem}
                                onSelectOrder={(v) => {
                                    setOrdemColuna(v.id as any);
                                    setOrdem((o) =>
                                        o === "crescente"
                                            ? "decrescente"
                                            : "crescente"
                                    );
                                }}
                                onEdit={(v) => setEditVisita(v.id)}
                                onDelete={(v) =>
                                    setMensagem({
                                        titulo: "Deletar Visitante?",
                                        confirmText: "Sim, deletar visitante",
                                        mensagem: (
                                            <>
                                                <span>
                                                    Tem certeza que deseja
                                                    deletar o visitante:{" "}
                                                    <strong>
                                                        {v.nome_completo}
                                                    </strong>
                                                    ?
                                                </span>
                                            </>
                                        ),
                                        onConfirm: () => apagarVisita(v.id),
                                    })
                                }
                            />
                        ) : (
                            <motion.div
                                className="alunos-page__vazio"
                                variants={variantsItem}
                            >
                                <p className="alunos-page__vazio--mensagem">
                                    Sem resultados
                                </p>
                                <motion.div
                                    className="alunos-page__cadastrar"
                                    whileTap={{ scale: 0.85 }}
                                >
                                    <button
                                        onClick={() => setAddVisita(true)}
                                        disabled={!currentIgreja}
                                    >
                                        <span>
                                            <FontAwesomeIcon icon={faPlus} />
                                        </span>
                                        Cadastrar nova visita
                                    </button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
            <AnimatePresence>
                {(addVisita || editVisita) && (
                    <CadastroAlunoModal
                        onCancel={() => {
                            setAddVisita(false);
                            setEditVisita("");
                        }}
                        onSave={(v: any) => {
                            salvarVisita(
                                editVisita
                                    ? {
                                          visitas: [v],
                                          dados: v,
                                          visitaId: editVisita,
                                          igrejaId:
                                              currentIgreja?.id ||
                                              user?.igrejaId,
                                      }
                                    : {
                                          visitas: [v],
                                          igrejaId:
                                              currentIgreja?.id ||
                                              user?.igrejaId,
                                      }
                            )
                                .then(() => setUpdate((v) => !v))
                                .catch((error) => {
                                    console.log("Deu esse erro", error);
                                    setMensagem({
                                        confirmText: "Ok",
                                        onConfirm: () => setMensagem(null),
                                        mensagem: error.message,
                                        titulo: "Erro cadastrar visita",
                                    });
                                })
                                .finally(() => {
                                    setAddVisita(false);
                                    setEditVisita("");
                                });
                        }}
                        alunoId={editVisita}
                        igrejaId={currentIgreja?.id || user?.igrejaId || ""}
                        type="visita"
                        key={"cadastro-visita"}
                    />
                )}
                <AlertModal
                    key={"alert-modal-visitas"}
                    isOpen={!!mensagem}
                    message={mensagem?.mensagem}
                    title={mensagem?.titulo || ""}
                    onCancel={() => setMensagem(null)}
                    onClose={() => setMensagem(null)}
                    onConfirm={() => mensagem?.onConfirm()}
                    confirmText={mensagem?.confirmText}
                    icon={mensagem?.icon}
                />
            </AnimatePresence>
        </>
    );
}

export default Visitas;
