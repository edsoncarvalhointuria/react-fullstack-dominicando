import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import {
    faCalendar,
    faCalendarDay,
    faCalendarDays,
} from "@fortawesome/free-solid-svg-icons";
import { useDataContext } from "../../../context/DataContext";
import Loading from "../../layout/loading/Loading";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import "./visitas.scss";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../utils/firebase";
import { Navigate, useNavigate } from "react-router-dom";
import SearchInput from "../../ui/SearchInput";
import { useAuthContext } from "../../../context/AuthContext";
import AlertModal from "../../ui/AlertModal";
import { getOrdem } from "../../../utils/getOrdem";
import TabelaDeGestao from "../../ui/TabelaDeGestao";
import OrderInput from "../../ui/OrderInput";
import type { TrimestresInterface } from "../../../interfaces/TrimestresInterface";
import AlterarTrimestre from "../../ui/AlterarTrimestre";

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

function Trimestres() {
    const OPTIONS = [
        {
            nome: "Nome",
            id: "nome",
            icon: faCalendarDays,
            isFilter: true,
            placeholder: "",
        },
        {
            nome: "Trimestre",
            id: "numero_trimestre",
            icon: faCalendarDays,
            isFilter: true,
            placeholder: "",
        },
        {
            nome: "Data Início",
            id: "data_inicio",
            icon: faCalendar,
            isFilter: true,
            placeholder: "sem data",
            dataObject: {},
        },
        {
            nome: "Data Final",
            id: "data_fim",
            icon: faCalendar,
            isFilter: true,
            placeholder: "sem data",
            dataObject: {},
        },
        {
            nome: "Ano",
            id: "ano",
            icon: faCalendarDay,
            isFilter: true,
            placeholder: "-",
        },
    ];
    const [isLoading, setIsLoading] = useState(false);
    const [editTrimestre, setEditTrimestre] = useState("");
    const [pesquisa, setPesquisa] = useState("");
    const [trimestres, setTrimestres] = useState<TrimestresInterface[]>([]);
    const [update, setUpdate] = useState(false);
    const [ordemColuna, setOrdemColuna] = useState<any>("");
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
    const { isLoadingData } = useDataContext();
    const { user, isSuperAdmin } = useAuthContext();
    const navigate = useNavigate();

    const trimestresMemo = useMemo(() => {
        let v = trimestres;
        v = v.filter(
            (v) =>
                v.ano === Number(pesquisa) ||
                v.nome.toLowerCase().includes(pesquisa) ||
                v.data_inicio
                    ?.toDate()
                    ?.toLocaleDateString("pt-BR")
                    ?.includes(pesquisa) ||
                v.data_fim
                    ?.toDate()
                    ?.toLocaleDateString("pt-BR")
                    ?.includes(pesquisa) ||
                v.numero_trimestre === Number(pesquisa)
        );
        v = v.sort((a: any, b: any) => getOrdem(a, b, ordemColuna, ordem));

        return v;
    }, [trimestres, ordem, ordemColuna, pesquisa]);
    useEffect(() => {
        const getTrimestres = async () => {
            const trimestresCll = collection(db, "trimestres");
            const q = query(
                trimestresCll,
                where("ministerioId", "==", user?.ministerioId)
            );
            const trimestresSnap = await getDocs(q);

            if (trimestresSnap.empty) return [];

            const trimestres = trimestresSnap.docs.map((v) => ({
                id: v.id,
                ...v.data(),
            })) as TrimestresInterface[];

            return trimestres.sort(
                (a, b) =>
                    b.data_fim.toDate().getTime() -
                    a.data_inicio.toDate().getTime()
            );
        };
        if (user)
            getTrimestres()
                .then((v) => {
                    setTrimestres(v);
                })
                .catch((err) => {
                    console.log("deu esse erro", err);
                    navigate("/visitas");
                })
                .finally(() => {
                    setIsLoading(false);
                });
    }, [user, update]);
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
                            Gestão de Trimestres
                        </h2>
                    </div>

                    <div className="alunos-page__header-filtros">
                        <div className="alunos-page__header-filtro">
                            <SearchInput
                                onSearch={(texto) => setPesquisa(texto)}
                                texto="trimestres"
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
                            <p>
                                Total de Trimestres: ({trimestresMemo.length})
                            </p>
                        </div>
                    </div>
                </div>
                <div className="alunos-page__body">
                    <AnimatePresence>
                        {trimestresMemo.length > 0 ? (
                            <TabelaDeGestao
                                currentList={trimestresMemo}
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
                                onEdit={(v) => setEditTrimestre(v.id)}
                                notDelete={true}
                                onDelete={() => {}}
                            />
                        ) : (
                            <motion.div
                                className="alunos-page__vazio"
                                variants={variantsItem}
                            >
                                <p className="alunos-page__vazio--mensagem">
                                    Sem resultados
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
            <AnimatePresence>
                {editTrimestre && (
                    <AlterarTrimestre
                        key={"alterar-trimestre"}
                        trimestreId={editTrimestre}
                        onCancel={() => setEditTrimestre("")}
                        onSave={() => {
                            setUpdate((v) => !v);
                        }}
                    />
                )}
            </AnimatePresence>
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
        </>
    );
}

export default Trimestres;
