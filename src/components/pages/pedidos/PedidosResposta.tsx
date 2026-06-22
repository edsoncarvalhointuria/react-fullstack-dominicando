import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
    PedidosEstrutura,
    PedidosInterface,
    PedidosRespostas,
    RevistaType,
} from "../../../interfaces/PedidosInterface";
import { useAuthContext } from "../../../context/AuthContext";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FormProvider, useForm, useWatch, type Control } from "react-hook-form";
import { collection, doc, documentId, getDoc, getDocs, query, where } from "firebase/firestore";
import { db, functions } from "../../../utils/firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faAngleLeft,
    faBasketShopping,
    faCalendar,
    faChalkboardUser,
    faCheckDouble,
    faCircleCheck,
    faCircleChevronUp,
    faClipboard,
    faCoins,
    faCopy,
    faEquals,
    faLock,
    faLockOpen,
    faPenToSquare,
    faPercent,
    faRankingStar,
    faShareNodes,
    faSquarePollHorizontal,
    faUsers,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import RevistaView from "./RevistaView";
import TextView from "./TextView";
import { AnimatePresence, motion } from "framer-motion";
import { httpsCallable } from "firebase/functions";
import "./pedidos-respostas.scss";
import "./pedidos-formulario.scss";
import { useDataContext } from "../../../context/DataContext";
import AlertModal from "../../ui/AlertModal";
import type { CacheLicaoInterface } from "../../../interfaces/CacheLicaoInterface";
import type { CacheUsuarioInteface } from "../../../interfaces/UsuarioInterface";
import { CoachMark } from "../portal_aluno/PortalAluno";
import { localStorageObj } from "../../../data/localStorageObj";
import Loading from "../../layout/loading/Loading";

const PedidosRespostasResumo = lazy(() => import("./PedidosRespostaResumo"));

const salvarRespostaPedido = httpsCallable(functions, "salvarRespostaPedido");

interface SugestaoInterface {
    totalOfertas: number;
    sugestoes: {
        [rotuloId: string]: {
            totalMatriculados: number;
            picoPresenca: number;
            mediaPresenca: number;
            totalProfessores: number;
        };
    };
}
interface ClassesReferencia {
    rotuloId: string;
    classeId: string;
    classeNome: string;
    licaoAtual: string;
    totalProfessores: number;
    totalArrecadado: number;
    totalMatriculados: number;
    mediaPresenca: number;
    picoPresenca: number;
}

const PedidosRespostaValoresItem = React.memo(
    ({
        rotuloNome,
        tipoRevista,
        qtd,
        precoUnitario,
    }: {
        rotuloNome: string;
        tipoRevista: string;
        qtd: number;
        precoUnitario: number;
    }) => {
        return (
            <div className="pedidos-resposta__valores__detalhes-info">
                <div className="pedidos-resposta__valores__detalhes-info--titulo">
                    <h5>
                        {rotuloNome}
                        {" - "}
                        {tipoRevista}
                    </h5>
                </div>

                <div className="pedidos-resposta__valores__detalhes-info--valor">
                    <div className="pedidos-resposta__valores__detalhes-info--qtd">
                        <p>QTD</p>
                        <span>{qtd}</span>
                    </div>
                    <p>
                        {(precoUnitario * qtd).toLocaleString("pt-BR", {
                            currency: "BRL",
                            style: "currency",
                        })}
                    </p>
                </div>
            </div>
        );
    },
);
const PedidosRespostaValoresDetalhes = React.memo(
    ({
        icon,
        isDiferenca,
        titulo,
        valor,
        diferenca,
    }: {
        icon: any;
        titulo: string;
        valor: number;
        isDiferenca: boolean;
        diferenca?: boolean;
    }) => {
        const classe = `pedidos-resposta__valores__detalhes-${isDiferenca ? "diferenca" : "total"}`;
        return (
            <div className={classe}>
                <div className={`${classe}--title`}>
                    <span>
                        <FontAwesomeIcon icon={icon} />
                    </span>
                    <p>{titulo}</p>
                </div>
                <div className={`${classe}--valor ${!isDiferenca ? "" : diferenca ? "menor" : "maior"}`}>
                    <p>
                        {valor.toLocaleString("pt-BR", {
                            currency: "BRL",
                            style: "currency",
                        })}
                    </p>
                </div>
            </div>
        );
    },
);
const PedidosRespostaValores = React.memo(
    ({
        control,
        pedido,
        totalArrecadado,
        rotulos,
        isActive,
    }: {
        control: Control<any>;
        pedido: (PedidosInterface & PedidosEstrutura) | null;
        totalArrecadado: number;
        rotulos: RotulosClassesInterface[];
        isActive: boolean;
    }) => {
        const [isOpen, setIsOpen] = useState(false);
        const pedidos = useWatch<{ respostas: { [key: string]: number } }>({
            control,
        });

        const estruturaMemo = useMemo(() => {
            return pedido?.estrutura.map((v) => {
                return {
                    ...v,
                    campos: v.campos.filter((v: any) => v.tipo === "revista"),
                };
            });
        }, [pedido, pedidos]);
        const totalMemo = useMemo(() => {
            let total = 0;
            estruturaMemo?.forEach((v) => {
                v.campos.forEach((v) => {
                    const revista = v as RevistaType;

                    total += revista.preco_unitario * (pedidos?.respostas?.[v.idKey] || 0);
                });
            });

            return total;
        }, [estruturaMemo]);

        return (
            <motion.div
                className="pedidos-resposta__valores"
                initial={{ position: "fixed", zIndex: 200, bottom: 0 }}
                animate={
                    isOpen ? { top: 0, height: "100%", bottom: "auto" } : { bottom: 0, height: "5rem", top: "auto" }
                }
            >
                <motion.div
                    id="pedidos-valores"
                    className={`pedidos-resposta__valores__total ${totalMemo < totalArrecadado ? "menor" : "maior"}`}
                    onTap={() => setIsOpen((v) => !v)}
                >
                    <div className="pedidos-resposta__valores__total-valor">
                        <h3>Total</h3>
                        <p>
                            <i>
                                <FontAwesomeIcon icon={faCoins} />
                            </i>
                            <span>
                                {totalMemo.toLocaleString("pt-BR", {
                                    currency: "BRL",
                                    style: "currency",
                                })}
                            </span>
                        </p>
                    </div>
                    <motion.button
                        type="button"
                        className="pedidos-resposta__valores__total-arrow"
                        whileHover={{ scale: 1.1, color: "#111" }}
                        animate={{ rotate: isOpen ? 180 : 0 }}
                    >
                        <FontAwesomeIcon icon={faCircleChevronUp} />
                    </motion.button>
                </motion.div>

                {isOpen && (
                    <div key={"detalhes-infos"} className="pedidos-resposta__valores__detalhes">
                        <h3>Total Pedido</h3>
                        <div className="pedidos-resposta__valores__detalhes-secoes">
                            {estruturaMemo?.map((v, i) => {
                                return (
                                    <div key={i} className="pedidos-resposta__valores__detalhes-secao">
                                        <h4>{v?.titulo}</h4>

                                        <div className="pedidos-resposta__valores__detalhes-infos">
                                            {v.campos.map((c) => {
                                                const revista = c as RevistaType;

                                                const qtd = pedidos?.respostas?.[revista.idKey] || 0;

                                                return (
                                                    <PedidosRespostaValoresItem
                                                        precoUnitario={revista.preco_unitario}
                                                        qtd={qtd}
                                                        rotuloNome={
                                                            rotulos.find((r) => r.id === revista.rotuloId)?.name || ""
                                                        }
                                                        tipoRevista={revista.tipoRevista}
                                                        key={c.idKey}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="pedidos-resposta__valores__detalhes-totais">
                            <PedidosRespostaValoresDetalhes
                                icon={faCoins}
                                isDiferenca={false}
                                titulo="Total Arrecadado"
                                valor={totalArrecadado}
                            />
                            <PedidosRespostaValoresDetalhes
                                icon={faBasketShopping}
                                isDiferenca={false}
                                titulo="Total do Pedido"
                                valor={totalMemo}
                            />
                            <PedidosRespostaValoresDetalhes
                                icon={faEquals}
                                isDiferenca={true}
                                titulo="Diferença"
                                valor={totalArrecadado - totalMemo}
                                diferenca={totalArrecadado - totalMemo < 0}
                            />
                        </div>
                        <div className="pedidos-resposta__valores__detalhes-enviar">
                            <button
                                type="submit"
                                title="Enviar Relatório"
                                onClick={() => {
                                    setTimeout(() => setIsOpen(false), 100);
                                }}
                                disabled={!isActive}
                            >
                                Enviar Relatório
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        );
    },
);

const PedidosRespostaShareModal = ({
    onClose,
    modeloId,
    link,
    title,
}: {
    onClose: () => void;
    modeloId?: string;
    link?: string;
    title?: string;
}) => {
    const [copy, setCopy] = useState(false);
    return (
        <motion.div
            className="compartilhar-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="compartilhar-modal__header">
                <div className="compartilhar-modal__title">
                    <span>
                        <FontAwesomeIcon icon={faShareNodes} />
                    </span>
                    <p>{title ? title : "Compartilhar Formulário"}</p>
                </div>
                <button className="compartilhar-modal__close" onClick={onClose}>
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>

            <div
                className="compartilhar-modal__body"
                onClick={() => {
                    setCopy(true);
                    navigator.clipboard.writeText(link ? link : `${window.location.origin}/pedidos/criar/${modeloId}`);
                }}
            >
                {link ? (
                    <p>{link}</p>
                ) : (
                    <p>
                        {window.location.origin}/pedidos/criar/
                        {modeloId}
                    </p>
                )}

                {!copy ? (
                    <span>
                        <FontAwesomeIcon icon={faCopy} />
                    </span>
                ) : (
                    <span>
                        <FontAwesomeIcon icon={faCheckDouble} />
                    </span>
                )}
            </div>
        </motion.div>
    );
};
const OPCOES_BTN = [
    {
        nome: "Maior Presença",
        icon: faRankingStar,
        key: "picoPresenca",
    },
    {
        nome: "Total Matriculados",
        icon: faUsers,
        key: "totalMatriculados",
    },
    { nome: "Média Presença", icon: faPercent, key: "mediaPresenca" },
];
const BotaoRespostaSugestao = React.memo(({ onSelect }: { onSelect: (opcao: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="pedidos-sugestao-button">
            <button type="button" id="sugerir-dados" title="Sugestão" onClick={() => setIsOpen((v) => !v)}>
                <i>
                    <FontAwesomeIcon icon={faClipboard} />
                </i>
                <span>Sugerir Dados</span>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key={"btn-sugestao"}
                        className="pedidos-sugestao-button__opcoes"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                    >
                        {OPCOES_BTN.map((v) => (
                            <div
                                className="pedidos-sugestao-button__opcao"
                                key={v.nome}
                                onClick={() => {
                                    onSelect(v.key);
                                    setIsOpen(false);
                                }}
                            >
                                <i>
                                    <FontAwesomeIcon icon={v.icon} />
                                </i>
                                <p>{v.nome}</p>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

const PedidosRespostaReferencia = ({
    referencia,
    rotulos,
}: {
    referencia: ClassesReferencia[];
    rotulos: RotulosClassesInterface[];
}) => {
    const refernciaMemo = useMemo(() => {
        return referencia
            .map((v) => ({
                ...v,
                rotulo: rotulos.find((r) => r.id === v.rotuloId),
            }))
            .sort((a, b) => {
                if (a.rotulo?.nome === "OUTRO") return 1;
                if (b.rotulo?.nome === "OUTRO") return -1;

                return (a.rotulo?.idade_minima || 0) - (b.rotulo?.idade_minima || 0);
            });
    }, [referencia]);
    return (
        <div className="pedidos-referencia">
            <div className="pedidos-referencia__header">
                <div className="pedidos-referencia__title">
                    <h2>
                        <i>
                            <FontAwesomeIcon icon={faSquarePollHorizontal} />
                        </i>
                        <span>Referência Classes</span>
                    </h2>
                </div>

                <div className="pedidos-referencia__descricao">
                    <p>Visão geral das classes neste trimestre</p>
                </div>
            </div>

            <div className="pedidos-referencia__body">
                <div className="pedidos-referencia__title-body">
                    <h3>Classes com registro no trimestre atual:</h3>
                </div>

                {refernciaMemo.length > 0 ? (
                    refernciaMemo.map((v) => (
                        <div className="pedidos-referencia__classe" key={v.classeId}>
                            <div className="pedidos-referencia__classe-header">
                                <h4>{v.classeNome}</h4>
                                <div className="pedidos-referencia__classe-container">
                                    <p>{v.rotulo?.nome}</p>
                                    <p>{v.licaoAtual}</p>
                                </div>
                            </div>
                            <div className="pedidos-referencia__classe-body">
                                <div className="pedidos-referencia__classe-infos">
                                    <div className="pedidos-referencia__classe-profs">
                                        <h5>
                                            <i>
                                                <FontAwesomeIcon icon={faChalkboardUser} />
                                            </i>
                                            <span>Total Professores</span>
                                        </h5>
                                        <p>{v.totalProfessores}</p>
                                    </div>
                                    <div className="pedidos-referencia__classe-matriculados">
                                        <h5>
                                            <i>
                                                <FontAwesomeIcon icon={faUsers} />
                                            </i>
                                            <span>Total Matriculados</span>
                                        </h5>
                                        <p>{v.totalMatriculados}</p>
                                    </div>
                                    <div className="pedidos-referencia__classe-media">
                                        <h5>
                                            <i>
                                                <FontAwesomeIcon icon={faPercent} />
                                            </i>
                                            <span>Média Presença</span>
                                        </h5>
                                        <p>{v.mediaPresenca}</p>
                                    </div>
                                    <div className="pedidos-referencia__classe-pico">
                                        <h5>
                                            <i>
                                                <FontAwesomeIcon icon={faRankingStar} />
                                            </i>
                                            <span>Domingo com maior presença</span>
                                        </h5>
                                        <p>{v.picoPresenca}</p>
                                    </div>
                                </div>
                                <div className="pedidos-referencia__classe-arrecadado">
                                    <h5>
                                        <i>
                                            <FontAwesomeIcon icon={faCoins} />
                                        </i>
                                        <span>Ofertas Total</span>
                                    </h5>
                                    <p>
                                        {v.totalArrecadado.toLocaleString("pt-BR", {
                                            currency: "BRL",
                                            style: "currency",
                                        })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="pedidos-referencia__vazio">
                        <p>Nenhum registro encontrado.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const RevistaRender = ({
    value,
    resposta,
    sugestao,
    opcaoSugestao,
    isActive,
    rotulos,
    control,
    setFocus,
    setValue,
}: {
    resposta?: RevistaType;
    value: RevistaType;
    sugestao?: SugestaoInterface;
    opcaoSugestao: string;
    isActive: boolean;
    rotulos: RotulosClassesInterface[];
    control: any;
    setValue: any;
    setFocus: any;
}) => {
    const PADRAO_REVISTAS = 0;
    const rotulo = rotulos.find((r) => value.rotuloId === r.id)!;
    const sugestaoObj = sugestao?.sugestoes?.[value.rotuloId];

    let sugestaoTotal = 0;
    if (opcaoSugestao && rotulo?.name !== "OUTRO") {
        const tipoRevista = value.tipoRevista.toLocaleLowerCase();
        if (tipoRevista.includes("professor")) sugestaoTotal = sugestaoObj?.totalProfessores || PADRAO_REVISTAS;
        if (tipoRevista.includes("aluno")) sugestaoTotal = (sugestaoObj as any)?.[opcaoSugestao] || PADRAO_REVISTAS;
    }
    return (
        <RevistaView
            preco={resposta && !isActive ? resposta?.preco_unitario || 0 : value.preco_unitario}
            rotulo={rotulo}
            tipoRevista={value.tipoRevista}
            key={value.idKey}
            form={{
                control,
                setValue,
                setFocus,
                required: value.obrigatorio,
                path: `respostas.${value.idKey}`,
                defaultValue: (resposta?.resposta as number) || sugestaoTotal,
            }}
        />
    );
};
const jaViuCoach = () => localStorage.setItem(localStorageObj["show-coach-pedidos-resposta"], "false");
function PedidosResposta() {
    const [isLoading, setIsLoading] = useState(true);
    const [isActive, setIsActive] = useState(true);
    const [share, setShare] = useState(false);
    const [rotulos, setRotulos] = useState<RotulosClassesInterface[]>([]);
    const [pedido, setPedido] = useState<(PedidosInterface & PedidosEstrutura) | null>(null);
    const [resposta, setResposta] = useState<PedidosRespostas | null>(null);
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
    const [sugestao, setSugestao] = useState<SugestaoInterface | null>(null);
    const [referencia, setRerencia] = useState<ClassesReferencia[]>([]);
    const [opcaoSugestao, setOpcaoSugestao] = useState("");

    const { user, isSuperAdmin, isSecretario } = useAuthContext();
    const { classes } = useDataContext();

    const { modeloId, type } = useParams();
    const [params, _] = useSearchParams();
    const navigate = useNavigate();

    const addSugestao = useCallback((v: string) => setOpcaoSugestao(v), []);

    const methods = useForm();
    const { handleSubmit, control, setFocus, setValue } = methods;

    const onSubmit = async (v: any) => {
        setIsLoading(true);

        try {
            await salvarRespostaPedido({
                ...v,
                modeloId,
                total_ofertas: sugestao?.totalOfertas || 0,
            });

            navigate("/pedidos");
        } catch (error: any) {
            setMensagem({
                cancelText: "Cancelar",
                confirmText: "Ok",
                message: error.message,
                onCancel: () => window.location.reload(),
                onClose: () => window.location.reload(),
                onConfirm: () => window.location.reload(),
                title: "Erro ao salvar",
            });
        }
    };

    useEffect(() => {
        const getRotulos = async () => {
            const rotulosCll = collection(db, "rotulos_classes");
            const q = query(rotulosCll, where("ministerioId", "==", user?.ministerioId));
            const rotulosDocs = await getDocs(q);

            if (rotulosDocs.empty) return;

            const r = rotulosDocs.docs.map((v) => {
                const data = v.data() as RotulosClassesInterface;
                const idadeMinima = data.idade_minima !== null ? `${data.idade_minima}` : "";
                const idadeMaxima = data.idade_maxima !== null ? `${data.idade_maxima}` : "";
                return {
                    ...data,
                    id: v.id,
                    nome: `${data.nome}${idadeMaxima || idadeMinima ? ` (${idadeMinima || "N/A"} - ${idadeMaxima || "N/A"} anos)` : ""}`,
                    name: data.nome,
                };
            });

            setRotulos(r);
        };
        const getPedido = async () => {
            const pedidoCll = collection(db, "pedidos");
            const q1 = query(
                pedidoCll,
                where("ministerioId", "==", user?.ministerioId),
                where(documentId(), "==", modeloId),
            );

            const pedidoRespostaCll = collection(db, "pedidos_respostas");
            const q2 = query(
                pedidoRespostaCll,
                where("ministerioId", "==", user?.ministerioId),
                where("igrejaId", "==", user?.igrejaId),
                where("modeloId", "==", modeloId),
            );

            const [pedidoDocs, pedidoRespostaDocs] = await Promise.all([getDocs(q1), getDocs(q2)]);

            if (pedidoDocs.empty) return navigate("/pedidos");
            if (!pedidoRespostaDocs.empty) setResposta(pedidoRespostaDocs.docs[0].data() as PedidosRespostas);

            const p = {
                id: pedidoDocs.docs[0].id,
                ...(pedidoDocs.docs[0].data() as PedidosInterface),
            };
            if (p.tipo === "modelo") return navigate("/pedidos");
            const estruturaCll = doc(db, "pedidos", modeloId!, "estrutura", "dados");
            const estruturaDoc = await getDoc(estruturaCll);
            if (!estruturaDoc.exists()) return navigate("/pedidos");

            const { estrutura } = estruturaDoc.data() as PedidosEstrutura;

            const dataAtual = new Date();
            dataAtual.setHours(11, 0, 0, 0);
            const dataFim = p.data_fim.toDate();

            setIsActive(dataAtual < dataFim);
            setPedido({ estrutura, ...p });
        };
        const getCache = async () => {
            const cacheLicoesCll = collection(db, "cache_licao");
            const q = query(
                cacheLicoesCll,
                where("ministerioId", "==", user?.ministerioId),
                where("igrejaId", "==", user?.igrejaId!),
                where("data_inicio", "<=", new Date()),
                where("data_fim", ">=", new Date()),
            );

            const usuariosD = doc(db, "cache_usuarios", user?.igrejaId!);

            const [cacheLicoesDocs, usuariosDocs] = await Promise.all([getDocs(q), getDoc(usuariosD)]);
            const classesMap = new Map(classes.map((v) => [v.id, v]));
            const classesReferenciaMap = new Map<string, ClassesReferencia>();
            const sugestaoMap = new Map();
            let totalOfertas = 0;
            cacheLicoesDocs.docs.forEach((v) => {
                const data = v.data() as CacheLicaoInterface;
                const { total_matriculados, pico_presenca } = data;

                const rotuloId = classesMap.get(data.classeId)?.rotuloId!;
                const classeId = data.classeId;
                const classeNome = data.classeNome;
                const licaoAtual = data.licaoNome;
                const totalArrecadado = data.total_ofertas;
                const totalMatriculados = total_matriculados;
                const picoPresenca = pico_presenca;
                const listaPresenca = Object.values(data.detalhes_aulas);
                const mediaPresenca = Math.ceil(
                    listaPresenca.reduce((prev, current) => current.total_presenca + prev, 0) / listaPresenca.length ||
                        1,
                );

                classesReferenciaMap.set(classeId, {
                    rotuloId,
                    classeId,
                    classeNome,
                    licaoAtual,
                    totalProfessores: 0,
                    totalArrecadado,
                    totalMatriculados,
                    picoPresenca,
                    mediaPresenca,
                });
                const sugestaoObj = sugestaoMap.get(rotuloId) || {
                    totalMatriculados: 0,
                    picoPresenca: 0,
                    mediaPresenca: 0,
                    totalProfessores: 0,
                };

                sugestaoObj.totalMatriculados += totalMatriculados;
                sugestaoObj.picoPresenca += picoPresenca;
                sugestaoObj.mediaPresenca += mediaPresenca;

                sugestaoMap.set(rotuloId, sugestaoObj);

                totalOfertas += data.total_ofertas || 0;
                return data;
            });

            const usuariosData = usuariosDocs.data() as CacheUsuarioInteface;
            Object.values(usuariosData.lista).forEach((v) => {
                const id = v.classeId;
                if (classesReferenciaMap.has(id)) {
                    const ref = classesReferenciaMap.get(id);
                    const sug = sugestaoMap.get(ref?.rotuloId);
                    sugestaoMap.set(ref?.rotuloId, {
                        ...sug,
                        totalProfessores: sug.totalProfessores + 1,
                    });
                    classesReferenciaMap.set(id, {
                        ...ref,
                        totalProfessores: (ref?.totalProfessores || 0) + 1,
                    } as any);
                }
            });

            setSugestao({
                totalOfertas,
                sugestoes: Object.fromEntries(sugestaoMap),
            } as any);
            setRerencia(Array.from(classesReferenciaMap.values()));
        };

        if (classes.length) {
            Promise.all([getRotulos(), getPedido(), getCache()])
                .catch((v) => {
                    console.log("deu esse erro", v);
                    navigate("/pedidos");
                })
                .finally(() => setIsLoading(false));
        }
        setShare(params.get("share") === "true");
    }, [classes]);
    if (isLoading) return <Loading />;
    if (isSecretario.current) return <Navigate to={"/dashboard"} />;
    return (
        <>
            <div className="pedidos-resposta">
                <div className="pedidos-resposta__header">
                    <div className="pedidos-resposta__header-infos">
                        <button title="voltar" onClick={() => navigate("/pedidos?redirect=false")}>
                            <FontAwesomeIcon icon={faAngleLeft} />
                        </button>

                        <div className="pedidos-resposta__header-buttons">
                            {isActive ? (
                                <div className="pedidos-resposta__status pedidos-resposta__status--open">
                                    <span>
                                        <FontAwesomeIcon icon={faLockOpen} />
                                    </span>
                                    <p>Formulário Ativo</p>
                                </div>
                            ) : (
                                <div className="pedidos-resposta__status pedidos-resposta__status--close">
                                    <span>
                                        <FontAwesomeIcon icon={faLock} />
                                    </span>
                                    <p>Formulário Encerrado</p>
                                </div>
                            )}

                            <button onClick={() => setShare(true)}>
                                <FontAwesomeIcon icon={faShareNodes} />
                            </button>
                            {isSuperAdmin.current && (
                                <button title="Editar" onClick={() => navigate(`/pedidos/criar/${modeloId}`)}>
                                    <FontAwesomeIcon icon={faPenToSquare} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="pedidos-resposta__header-abas">
                        <div
                            id="aba-referencia"
                            className={`pedidos-resposta__header-aba ${type === "referencia" ? "active" : ""}`}
                            onClick={() => navigate(`/pedidos/formulario/${modeloId}/referencia`)}
                        >
                            <p>Referência</p>
                        </div>
                        <div
                            className={`pedidos-resposta__header-aba ${type !== "resposta" && type !== "referencia" ? "active" : ""}`}
                            onClick={() => navigate(`/pedidos/formulario/${modeloId}`)}
                        >
                            <p>Resumo</p>
                        </div>
                        {isSuperAdmin.current && (
                            <div
                                className={`pedidos-resposta__header-aba ${type === "resposta" ? "active" : ""}`}
                                onClick={() => navigate(`/pedidos/formulario/${modeloId}/resposta`)}
                            >
                                <p>Respostas</p>
                            </div>
                        )}
                    </div>
                </div>

                {type === "resposta" && isSuperAdmin.current ? (
                    <Suspense fallback={<Loading />}>
                        <PedidosRespostasResumo modeloId={modeloId || ""} pedido={pedido!} rotulos={rotulos} />
                    </Suspense>
                ) : type === "referencia" ? (
                    <PedidosRespostaReferencia referencia={referencia} rotulos={rotulos} />
                ) : (
                    <FormProvider {...methods}>
                        <form className="pedidos-resposta__form" onSubmit={handleSubmit(onSubmit)}>
                            <CoachMark
                                isOpen={!localStorage.getItem(localStorageObj["show-coach-pedidos-resposta"])}
                                refs={[
                                    {
                                        id: "sugerir-dados",
                                        mensagem: "Você pode preencher alguns valores automaticamente clicando aqui.",
                                    },
                                    {
                                        id: "aba-referencia",
                                        mensagem:
                                            "Você pode clicar aqui para ver detalhes das classes: Total Professores, Total Matriculados, etc",
                                    },
                                    {
                                        id: "pedidos-valores",
                                        mensagem: "Clique aqui para ver o resumo e finalizar a solicitação.",
                                    },
                                ]}
                                onClose={jaViuCoach}
                            />

                            {resposta ? (
                                <div className="pedidos-resposta__form-ja-enviado">
                                    <span>
                                        <FontAwesomeIcon icon={faCircleCheck} />
                                    </span>
                                    <p>
                                        Formulário enviado dia{" "}
                                        <span>{resposta.data_resposta.toDate().toLocaleDateString("pt-BR")}</span>
                                    </p>
                                </div>
                            ) : (
                                <div className="pedidos-resposta__form-sugestao">
                                    <BotaoRespostaSugestao onSelect={addSugestao} />
                                </div>
                            )}

                            <div className="pedidos-resposta__form-title">
                                <h2>{pedido?.titulo}</h2>

                                <div className="pedidos-resposta__form-datas">
                                    <div className="pedidos-resposta__form-data">
                                        <p>
                                            <span>
                                                <FontAwesomeIcon icon={faCalendar} />
                                            </span>
                                            <span>Abertura</span>
                                        </p>
                                        <data value={pedido?.data_inicio.toDate().toLocaleDateString("pt-BR")}>
                                            {pedido?.data_inicio.toDate().toLocaleDateString("pt-BR")}
                                        </data>
                                    </div>

                                    <div className="pedidos-resposta__form-data">
                                        <p>
                                            <span>
                                                <FontAwesomeIcon icon={faCalendar} />
                                            </span>
                                            <span>Encerramento</span>
                                        </p>
                                        <data value={pedido?.data_fim?.toDate().toLocaleDateString("pt-BR")}>
                                            {pedido?.data_fim?.toDate().toLocaleDateString("pt-BR")}
                                        </data>
                                    </div>
                                </div>

                                {pedido?.descricao && <p>{pedido?.descricao}</p>}
                            </div>

                            <div className="pedidos-resposta__form-secoes">
                                {pedido?.estrutura.map((v, i) => (
                                    <div key={v.idKey || i} className="pedidos-resposta__form__secao">
                                        {v.titulo && (
                                            <div className="pedidos-resposta__form__secao-titulo">
                                                <h3>{v.titulo}</h3>
                                            </div>
                                        )}

                                        <div className="pedidos-resposta__form__secao-inputs">
                                            {v.campos.map((v) => {
                                                const resp = resposta
                                                    ? (resposta.estrutura[v.idKey] as any)
                                                    : undefined;
                                                if (v.tipo === "revista") {
                                                    return (
                                                        <RevistaRender
                                                            control={control}
                                                            setFocus={setFocus}
                                                            setValue={setValue}
                                                            isActive={isActive}
                                                            opcaoSugestao={opcaoSugestao}
                                                            rotulos={rotulos}
                                                            value={v}
                                                            key={v.idKey}
                                                            resposta={resp}
                                                            sugestao={sugestao!}
                                                        />
                                                    );
                                                } else
                                                    return (
                                                        <TextView
                                                            titulo={v.titulo}
                                                            key={v.idKey}
                                                            form={{
                                                                control,
                                                                setFocus,
                                                                required: v.obrigatorio,
                                                                path: `respostas.${v.idKey}`,
                                                                defaultValue: resp?.resposta || "",
                                                            }}
                                                        />
                                                    );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <PedidosRespostaValores
                                control={control}
                                pedido={pedido}
                                totalArrecadado={sugestao?.totalOfertas || 0}
                                rotulos={rotulos}
                                isActive={isActive}
                            />
                        </form>
                    </FormProvider>
                )}
            </div>
            <AnimatePresence>
                {share && <PedidosRespostaShareModal modeloId={modeloId || ""} onClose={() => setShare(false)} />}
            </AnimatePresence>
            <AlertModal isOpen={!!mensagem} {...mensagem!} />
        </>
    );
}

export { PedidosRespostaShareModal };
export default PedidosResposta;
