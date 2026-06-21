import {
    faAlarmClock,
    faBagShopping,
    faCircleCheck,
    faCirclePlus,
    faCircleXmark,
    faClock,
    faPlus,
    faRectangleList,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import SearchInput from "../../ui/SearchInput";
import { useEffect, useMemo, useState } from "react";
import "./pedidos.scss";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthContext } from "../../../context/AuthContext";
import { collection, getDocs, limit, query, where, orderBy, getDocsFromCache } from "firebase/firestore";
import { db } from "../../../utils/firebase";
import type { PedidosInterface } from "../../../interfaces/PedidosInterface";
import Loading from "../../layout/loading/Loading";
import { houveAtualizacaoMinisterio, salvarSistemaLocalStorageMinisterio } from "../../../utils/getSistema";
import VazioDefault from "../../ui/VazioDefault";

const LIMITE_DE_REVISTAS = 15;

const FormularioCard = ({
    title,
    isActive,
    dataInicio,
    dataFim,
    id,
}: {
    title: string;
    isActive: boolean;
    dataInicio: string;
    dataFim: string;
    id: string;
}) => {
    return (
        <div className="pedido-card">
            <Link to={`formulario/${id}`}>
                <h3>{title}</h3>

                <div className="pedido-card__detalhes">
                    <div className="pedido-card__status">
                        {isActive ? (
                            <>
                                <span>
                                    <FontAwesomeIcon icon={faCircleCheck} />
                                </span>
                                <p>Ativo</p>
                            </>
                        ) : (
                            <>
                                <span>
                                    <FontAwesomeIcon icon={faCircleXmark} />
                                </span>
                                <p>Encerrada</p>
                            </>
                        )}
                    </div>

                    <div className="pedido-card__datas">
                        <data className="pedido-card__data" value={dataInicio}>
                            <span>
                                <FontAwesomeIcon icon={faClock} />
                            </span>
                            <p>{dataInicio}</p>
                        </data>
                        <data className="pedido-card__data" value={dataFim}>
                            <span>
                                <FontAwesomeIcon icon={faAlarmClock} />
                            </span>
                            <p>{dataFim}</p>
                        </data>
                    </div>
                </div>
            </Link>
        </div>
    );
};
const NovoFormularioModal = ({ onClose }: { onClose: () => void }) => {
    const [modelos, setModelos] = useState<PedidosInterface[]>([]);
    const { user, isSuperAdmin } = useAuthContext();

    useEffect(() => {
        const getModelos = async () => {
            const modelosCll = collection(db, "pedidos");
            const q = query(modelosCll, where("ministerioId", "==", user?.ministerioId), where("tipo", "==", "modelo"));

            const houveAtualizacao = await houveAtualizacaoMinisterio(user?.ministerioId!, "pedidos");

            let docs;
            if (houveAtualizacao.houveAtualizacao) docs = await getDocs(q);
            else {
                docs = await getDocsFromCache(q);
                if (docs.empty) docs = await getDocs(q);
            }

            salvarSistemaLocalStorageMinisterio(houveAtualizacao);

            const modelos = docs.docs.map((v) => ({ id: v.id, ...v.data() }) as PedidosInterface);
            setModelos(modelos);
        };

        if (!isSuperAdmin.current) onClose();
        else getModelos();
    }, []);
    return (
        <div className="novo-formulario__overflow">
            <motion.div
                className="novo-formulario"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ y: 10, opacity: 0 }}
                key={"novo-formulario"}
            >
                <div className="novo-formulario__header">
                    <div className="novo-formulario__title">
                        <h3>
                            <span>
                                <FontAwesomeIcon icon={faRectangleList} />
                            </span>
                            <span>Novo Formulário</span>
                        </h3>

                        <button title="fechar" onClick={onClose} className="novo-formulario__close">
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>
                </div>

                <div className="novo-formulario__body">
                    <h3>Escolha o Modelo</h3>

                    <div className="novo-formulario__modelos">
                        <div className="novo-formulario__card">
                            <Link to={"criar"}>
                                <span>
                                    <FontAwesomeIcon icon={faCirclePlus} />
                                </span>
                                <span>Formulário em Branco</span>
                            </Link>
                        </div>

                        {modelos.map((v) => (
                            <div className="novo-formulario__card" key={v.id}>
                                <Link to={`criar/${v.id}`}>
                                    <span>{v.nomeModelo}</span>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

function Pedidos() {
    const [pesquisa, setPesquisa] = useState("");
    const [novoForm, setNovoForm] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [pedidos, setPedidos] = useState<PedidosInterface[]>([]);
    const [limite, setLimite] = useState(LIMITE_DE_REVISTAS);

    const navigate = useNavigate();
    const [params, _] = useSearchParams();

    const pedidosMemo = useMemo(() => {
        if (!pedidos) return [];
        return pedidos
            .filter(
                (v) =>
                    v.titulo.toLowerCase().includes(pesquisa) ||
                    v.data_inicio.toDate().toLocaleDateString("pt-BR").includes(pesquisa) ||
                    v.data_fim.toDate().toLocaleDateString("pt-BR").includes(pesquisa),
            )
            .sort((a, b) => b.data_fim.toDate().getTime() - a.data_fim.toDate().getTime());
    }, [pesquisa, pedidos]);

    const { isSecretario, isSuperAdmin, user, isAdmin } = useAuthContext();

    useEffect(() => {
        const getModelos = async () => {
            setIsLoading(true);
            const pedidosCll = collection(db, "pedidos");
            const q = query(
                pedidosCll,
                where("ministerioId", "==", user?.ministerioId),
                where("tipo", "==", "formulario"),
                limit(limite),
            );

            const houveAtualizacao = await houveAtualizacaoMinisterio(user?.ministerioId!, "pedidos");

            let docs;
            if (houveAtualizacao.houveAtualizacao) docs = await getDocs(q);
            else {
                docs = await getDocsFromCache(q);
                if (docs.empty || limite > LIMITE_DE_REVISTAS) docs = await getDocs(q);
            }

            const p = docs.docs.map((v) => ({ id: v.id, ...v.data() }) as PedidosInterface);

            setPedidos(p);
        };
        const getUltimoForm = async () => {
            const pedidosCll = collection(db, "pedidos");
            const q = query(
                pedidosCll,
                where("data_fim", ">=", new Date()),
                where("ministerioId", "==", user?.ministerioId),
                where("tipo", "==", "formulario"),
                limit(1),
                orderBy("data_fim", "desc"),
            );

            const pedidoDoc = await getDocs(q);

            if (pedidoDoc.empty) {
                getModelos().finally(() => setIsLoading(false));
            } else {
                const pedido = pedidoDoc.docs[0].id;
                navigate(`/pedidos/formulario/${pedido}`);
            }
        };

        if (isSuperAdmin.current || (params.get("redirect") && params.get("redirect") === "false")) {
            getModelos().finally(() => setIsLoading(false));
        } else if (isAdmin.current) {
            getUltimoForm();
        }
    }, [limite]);
    if (isSecretario.current) return <Navigate to={"/dashboard"} />;
    if (isLoading) return <Loading />;
    return (
        <>
            <div className="pedidos">
                <div className="pedidos__header">
                    <h2>
                        <span>
                            <FontAwesomeIcon icon={faBagShopping} />
                        </span>
                        <span>Pedidos</span>
                    </h2>

                    {isSuperAdmin.current && (
                        <div className="pedidos__cadastrar">
                            <button onClick={() => setNovoForm(true)}>
                                <span>
                                    <FontAwesomeIcon icon={faPlus} />
                                </span>
                                <span>Novo Formulário</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="pedidos__body">
                    <div className="pedidos__pesquisa">
                        <SearchInput onSearch={setPesquisa} texto="formulários" />
                    </div>
                    {pedidosMemo.length ? (
                        <>
                            <div className="pedidos__grid">
                                {pedidosMemo.map((v) => (
                                    <FormularioCard
                                        key={v.id}
                                        dataFim={v.data_fim.toDate().toLocaleDateString("pt-BR")}
                                        dataInicio={v.data_inicio.toDate().toLocaleDateString("pt-BR")}
                                        id={v.id!}
                                        isActive={new Date() <= v.data_fim.toDate()}
                                        title={v.titulo}
                                    />
                                ))}

                                {pedidos.length >= 15 && (
                                    <div
                                        className="pedido-card pedido-card--more"
                                        onClick={() => setLimite((v) => v + 15)}
                                    >
                                        <h3>Carregar Mais 15</h3>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <VazioDefault mensagem="Sem Resultado" />
                    )}
                </div>
            </div>

            <AnimatePresence>{novoForm && <NovoFormularioModal onClose={() => setNovoForm(false)} />}</AnimatePresence>
        </>
    );
}

export default Pedidos;
