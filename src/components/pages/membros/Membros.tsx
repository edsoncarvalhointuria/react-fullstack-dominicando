import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faAddressCard,
    faCakeCandles,
    faCalendar,
    faCalendarCheck,
    faFeather,
    faPhone,
    faPlus,
    faThumbsUp,
} from "@fortawesome/free-solid-svg-icons";
import Dropdown from "../../ui/Dropdown";
import { useDataContext } from "../../../context/DataContext";
import Loading from "../../layout/loading/Loading";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
    collection,
    getDocs,
    query,
    Timestamp,
    where,
} from "firebase/firestore";
import { db } from "../../../utils/firebase";
import { useNavigate } from "react-router-dom";
import SearchInput from "../../ui/SearchInput";
import { useAuthContext } from "../../../context/AuthContext";
import AlertModal from "../../ui/AlertModal";
import { getFunctions, httpsCallable } from "firebase/functions";
import type { MembroInterface } from "../../../interfaces/MembroInterface";
import CadastroMembroModal from "../../ui/CadastroMembroModal";
import TabelaDeGestao from "../../ui/TabelaDeGestao";
import OrderInput from "../../ui/OrderInput";
import { getIdade } from "../../../utils/getIdade";
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
const deletarMembro = httpsCallable(functions, "deletarMembro");

function Membros() {
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
            placeholder: "",
            dataObject: {},
        },
        {
            nome: "Idade",
            id: "idade",
            icon: faCakeCandles,
            isFilter: true,
            placeholder: "",
        },
        {
            nome: "Contato",
            id: "contato",
            icon: faPhone,
            isFilter: false,
            placeholder: "sem contato",
        },
        {
            nome: "Validade",
            id: "validade",
            icon: faCalendarCheck,
            isFilter: true,
            placeholder: "-",
            dataObject: {
                month: "2-digit",
                year: "numeric",
            },
        },
        {
            nome: "Registro",
            id: "registro",
            icon: faAddressCard,
            isFilter: false,
            placeholder: "-",
        },
    ];
    const [isLoading, setIsLoading] = useState(false);
    const [editMembro, setEditMembro] = useState("");
    const [addMembro, setAddMembro] = useState(false);
    const [currentIgreja, setCurrentIgreja] = useState<IgrejaInterface | null>(
        null
    );
    const [membros, setMembros] = useState<
        (MembroInterface & { idade: string })[]
    >([]);
    const [update, setUpdate] = useState(false);
    const [ordemColuna, setOrdemColuna] = useState<
        keyof (MembroInterface & {
            idade: number;
        })
    >("nome_completo");
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
    const [pesquisa, setPesquisa] = useState("");

    const { isLoadingData, igrejas } = useDataContext();
    const { isSecretario, isSuperAdmin } = useAuthContext();
    const { user } = useAuthContext();
    const navigate = useNavigate();

    const apagarUsuario = async (membroId: string) => {
        setIsLoading(true);
        setMensagem(null);

        try {
            const { data } = await deletarMembro({ membroId });
            setMensagem({
                confirmText: "Ok",
                onConfirm: () => setMensagem(null),
                mensagem: (data as any).message,
                titulo: "Membro deletado",
                icon: <FontAwesomeIcon icon={faThumbsUp} />,
            });
            setUpdate((v) => !v);
        } catch (error: any) {
            console.log("Deu esse erro", error);
            setMensagem({
                confirmText: "Ok",
                onConfirm: () => setMensagem(null),
                mensagem: error.message,
                titulo: "Erro ao deletar aluno",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const membrosMemo = useMemo(() => {
        let m = membros;
        m = m.filter(
            (v) =>
                v.nome_completo.toLowerCase().includes(pesquisa) ||
                v.data_nascimento
                    .toDate()
                    .toLocaleDateString("pt-BR")
                    .includes(pesquisa) ||
                v.idade === pesquisa ||
                v.contato?.includes(pesquisa) ||
                v.registro === pesquisa
        );

        return m.sort((a: any, b: any) => getOrdem(a, b, ordemColuna, ordem));
    }, [membros, pesquisa, ordemColuna, ordem]);
    useEffect(() => {
        const getMembros = async (igrejaId: string) => {
            const membrosCll = collection(db, "membros");
            const q = query(
                membrosCll,
                where("igrejaId", "==", igrejaId),
                where("ministerioId", "==", user?.ministerioId)
            );
            const membrosSnap = await getDocs(q);

            if (membrosSnap.empty) return [];

            const membros = membrosSnap.docs.map((v) => ({
                id: v.id,
                ...v.data(),
                idade: `${getIdade(
                    v.data().data_nascimento as Timestamp
                )} anos`,
            })) as (MembroInterface & { idade: string })[];

            return membros;
        };
        if (currentIgreja)
            getMembros(currentIgreja.id)
                .then((m) => {
                    setMembros(m);
                })
                .catch((err) => {
                    console.log("deu esse erro", err);
                    navigate("/membros");
                })
                .finally(() => {
                    setIsLoading(false);
                });
    }, [currentIgreja, update]);
    useEffect(() => {
        if (igrejas.length && !isSuperAdmin.current)
            setCurrentIgreja(igrejas[0]);
    }, [igrejas]);
    if (!isLoadingData && isSecretario.current) navigate("/dashboard");
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
                            Gestão de Membros
                        </h2>
                        <motion.div
                            className="alunos-page__cadastrar"
                            whileTap={{ scale: 0.85 }}
                        >
                            <button
                                onClick={() => setAddMembro(true)}
                                disabled={!currentIgreja}
                            >
                                <span>
                                    <FontAwesomeIcon icon={faPlus} />
                                </span>
                                Cadastrar novo membro
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
                                texto="Membros"
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
                        <div className="alunos-page__header-qtd">
                            <p>Total de Membros: ({membrosMemo.length})</p>
                        </div>
                    </div>
                </div>
                <div className="alunos-page__body">
                    <AnimatePresence>
                        {membrosMemo.length > 0 ? (
                            <TabelaDeGestao
                                options={OPTIONS}
                                currentList={membrosMemo as any}
                                currentOrder={ordemColuna}
                                ordem={ordem}
                                onSelectOrder={(v) => {
                                    setOrdem((v) =>
                                        v === "crescente"
                                            ? "decrescente"
                                            : "crescente"
                                    );
                                    setOrdemColuna(v.id as any);
                                }}
                                onDelete={(v) => {
                                    setMensagem({
                                        titulo: "Deletar Membro?",
                                        confirmText: "Sim, deletar membro",
                                        mensagem: (
                                            <>
                                                <span>
                                                    Tem certeza que deseja
                                                    deletar o membro:{" "}
                                                    <strong>
                                                        {v.nome_completo}
                                                    </strong>
                                                    ?
                                                </span>
                                                <span>
                                                    Isso irá apagar{" "}
                                                    <strong>TODOS</strong> os
                                                    dados associados.
                                                </span>
                                            </>
                                        ),
                                        onConfirm: () => apagarUsuario(v.id),
                                    });
                                }}
                                onEdit={(v) => {
                                    setEditMembro(v.id);
                                }}
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
                                        onClick={() => setAddMembro(true)}
                                        disabled={!currentIgreja}
                                    >
                                        <span>
                                            <FontAwesomeIcon icon={faPlus} />
                                        </span>
                                        Cadastrar novo membro
                                    </button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
            <AnimatePresence>
                {(addMembro || editMembro) && (
                    <CadastroMembroModal
                        key={"cadastro-membro-modal"}
                        onCancel={() => {
                            setAddMembro(false);
                            setEditMembro("");
                        }}
                        onSave={(value) => {
                            const membroComIdade = {
                                ...value,
                                idade: `${getIdade(
                                    value.data_nascimento
                                )} anos`,
                            };

                            if (!editMembro) {
                                setMembros((v) => [...v, membroComIdade]);
                            } else {
                                setMembros((v) => [
                                    ...v.filter((a) => a.id !== editMembro),
                                    membroComIdade,
                                ]);
                            }
                            setAddMembro(false);
                            setEditMembro("");
                        }}
                        membroId={editMembro}
                        igrejaId={currentIgreja?.id || user?.igrejaId || ""}
                    />
                )}
                <AlertModal
                    key={"alert-modal-membros"}
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

export default Membros;
