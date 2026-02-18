import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import type {
    PedidosEstrutura,
    PedidosInterface,
    PedidosRespostas,
    RevistaType,
    TextType,
} from "../../../interfaces/PedidosInterface";
import { useAuthContext } from "../../../context/AuthContext";
import {
    Navigate,
    useNavigate,
    useParams,
    useSearchParams,
} from "react-router-dom";
import { FormProvider, useForm, useWatch, type Control } from "react-hook-form";
import {
    collection,
    doc,
    documentId,
    getDoc,
    getDocs,
    query,
    where,
} from "firebase/firestore";
import { db } from "../../../utils/firebase";
import Loading from "../../layout/loading/Loading";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faAngleDown,
    faAngleLeft,
    faBasketShopping,
    faBookBookmark,
    faCalendar,
    faChalkboardUser,
    faCheckDouble,
    faCircleCheck,
    faCircleChevronUp,
    faClipboard,
    faCoins,
    faCopy,
    faEquals,
    faFileCsv,
    faHandHoldingDollar,
    faLock,
    faLockOpen,
    faMoneyBills,
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
import {
    animate,
    AnimatePresence,
    motion,
    useMotionValue,
    useTransform,
} from "framer-motion";
import { getFunctions, httpsCallable } from "firebase/functions";
import "./pedidos-respostas.scss";
import { useDataContext } from "../../../context/DataContext";
import SearchInput from "../../ui/SearchInput";
import Dropdown from "../../ui/Dropdown";
import AlertModal from "../../ui/AlertModal";
import LoadingModal from "../../layout/loading/LoadingModal";
import type { CacheLicaoInterface } from "../../../interfaces/CacheLicaoInterface";
import type { CacheUsuarioInteface } from "../../../interfaces/UsuarioInterface";

const functions = getFunctions();
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
                <div
                    className={`${classe}--valor ${!isDiferenca ? "" : diferenca ? "menor" : "maior"}`}
                >
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

                    total +=
                        revista.preco_unitario *
                        (pedidos?.respostas?.[v.idKey] || 0);
                });
            });

            return total;
        }, [estruturaMemo]);

        return (
            <motion.div
                className="pedidos-resposta__valores"
                initial={{ position: "fixed", zIndex: 200, bottom: 0 }}
                animate={
                    isOpen
                        ? { top: 0, height: "100%", bottom: "auto" }
                        : { bottom: 0, height: "5rem", top: "auto" }
                }
            >
                <motion.div
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
                    <div
                        key={"detalhes-infos"}
                        className="pedidos-resposta__valores__detalhes"
                    >
                        <h3>Total Pedido</h3>
                        <div className="pedidos-resposta__valores__detalhes-secoes">
                            {estruturaMemo?.map((v, i) => {
                                return (
                                    <div
                                        key={i}
                                        className="pedidos-resposta__valores__detalhes-secao"
                                    >
                                        <h4>{v?.titulo}</h4>

                                        <div className="pedidos-resposta__valores__detalhes-infos">
                                            {v.campos.map((c) => {
                                                const revista =
                                                    c as RevistaType;

                                                const qtd =
                                                    pedidos?.respostas?.[
                                                        revista.idKey
                                                    ] || 0;

                                                return (
                                                    <PedidosRespostaValoresItem
                                                        precoUnitario={
                                                            revista.preco_unitario
                                                        }
                                                        qtd={qtd}
                                                        rotuloNome={
                                                            rotulos.find(
                                                                (r) =>
                                                                    r.id ===
                                                                    revista.rotuloId,
                                                            )?.name || ""
                                                        }
                                                        tipoRevista={
                                                            revista.tipoRevista
                                                        }
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

const PedidosRespostaIgreja = React.memo(
    ({
        igreja,
        nomeIgreja,
        item,
        isEnviadoPor,
    }: {
        igreja: PedidosRespostas;
        nomeIgreja: string;
        item: RevistaType | TextType;
        isEnviadoPor?: boolean;
    }) => {
        return (
            <div className="pedidos-resumo__secao-input__igreja">
                <h5>{nomeIgreja}</h5>
                {isEnviadoPor ? (
                    <div className="pedidos-resumo__secao-input__igreja-text">
                        <p>{igreja.envido_por.nome}</p>
                    </div>
                ) : item.tipo === "revista" ? (
                    <>
                        <div className="pedidos-resumo__secao-input__igreja-qtd">
                            <span>QTD</span>
                            <p>{igreja.estrutura?.[item.idKey].resposta}</p>
                        </div>

                        <div className="pedidos-resumo__secao-input__igreja-preco">
                            <p>
                                {(
                                    (igreja.estrutura?.[item.idKey]
                                        .resposta as number) *
                                    item.preco_unitario
                                ).toLocaleString("pt-BR", {
                                    currency: "BRL",
                                    style: "currency",
                                })}
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="pedidos-resumo__secao-input__igreja-text">
                        <p>{igreja.estrutura?.[item.idKey].resposta}</p>
                    </div>
                )}
            </div>
        );
    },
);
const PedidosRespostaInput = React.memo(
    ({
        item,
        rotulos,
        respostasMap,
        igrejasMemo,
        totalRevistas,
        total,
        preco,
        currentIgreja,
        isEnviadoPor,
    }: {
        item: RevistaType | TextType;
        rotulos: RotulosClassesInterface[];
        respostasMap: Map<string | number, PedidosRespostas[]>;
        igrejasMemo: Map<string, IgrejaInterface>;
        totalRevistas: number;
        total: number;
        preco: number;
        currentIgreja?: IgrejaInterface | null;
        isEnviadoPor?: boolean;
    }) => {
        const [isOpen, setIsOpen] = useState(true);
        const Title = ({ titulo }: { titulo: string }) => {
            return (
                <div className="pedidos-resumo__secao-input__title">
                    <motion.span
                        animate={{ rotate: isOpen ? 0 : -90 }}
                        initial={{ rotate: 0 }}
                    >
                        <FontAwesomeIcon icon={faAngleDown} />
                    </motion.span>
                    <h4>{titulo}</h4>
                </div>
            );
        };
        const InpValor = ({
            icon,
            titulo,
        }: {
            icon: any;
            titulo: string | number;
        }) => {
            return (
                <div className="pedidos-resumo__secao-input__valor">
                    <span>
                        <FontAwesomeIcon icon={icon} />
                    </span>
                    <p>{titulo}</p>
                </div>
            );
        };

        const igrejaInputMemo = useMemo(() => {
            if (!currentIgreja) return respostasMap?.get(item.idKey) || [];
            const i = respostasMap
                ?.get(item.idKey)
                ?.find((v) => v.igrejaId === currentIgreja.id);
            return i ? [i] : [];
        }, [currentIgreja, respostasMap]);

        return (
            <div className="pedidos-resumo__secao-input">
                <motion.div
                    className="pedidos-resumo__secao-input__infos"
                    onTap={() => setIsOpen((v) => !v)}
                >
                    {isEnviadoPor ? (
                        <Title titulo={`Nomes`} />
                    ) : item.tipo === "revista" ? (
                        <>
                            <Title
                                titulo={`${rotulos.find((v) => v.id === item.rotuloId)?.name} - ${item.tipoRevista}`}
                            />
                            <div className="pedidos-resumo__secao-input__valores">
                                <InpValor
                                    icon={faHandHoldingDollar}
                                    titulo={preco.toLocaleString("pt-BR", {
                                        currency: "BRL",
                                        style: "currency",
                                    })}
                                />
                                <InpValor
                                    icon={faBookBookmark}
                                    titulo={totalRevistas}
                                />

                                <InpValor
                                    icon={faMoneyBills}
                                    titulo={total.toLocaleString("pt-BR", {
                                        currency: "BRL",
                                        style: "currency",
                                    })}
                                />
                            </div>
                        </>
                    ) : (
                        <Title titulo={item.titulo || ""} />
                    )}
                </motion.div>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            transition={{ ease: "linear" }}
                            key={"igreja-drop"}
                        >
                            <div className="pedidos-resumo__secao-input__igrejas">
                                {igrejaInputMemo?.map((i: any, index) => (
                                    <PedidosRespostaIgreja
                                        key={i.igrejaId || index}
                                        igreja={i}
                                        item={item}
                                        nomeIgreja={
                                            igrejasMemo.get(i.igrejaId)?.nome ||
                                            ""
                                        }
                                        isEnviadoPor={isEnviadoPor}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    },
);
const PedidosRespostaCard = React.memo(
    ({
        isProgresso,
        titulo,
        descricao,
        type,
        porcento,
        icon,
        isCurrency,
    }: {
        isProgresso?: boolean;
        titulo: string;
        descricao: string | number;
        type: "enviados" | "revistas" | "total";
        porcento?: number;
        icon: any;
        isCurrency?: boolean;
    }) => {
        const value = useMotionValue(0);
        const desc = useTransform(value, (v) =>
            isCurrency
                ? v.toLocaleString("pt-BR", {
                      currency: "BRL",
                      style: "currency",
                  })
                : Math.round(v).toString(),
        );
        useEffect(() => {
            const animation = animate(value, descricao as number, {
                duration: 0.8,
                delay: 0.2,
            });

            return () => animation.stop();
        }, [descricao]);
        return (
            <div className={`pedidos-resumo__card ${type}`}>
                <h2>
                    <span>
                        <FontAwesomeIcon icon={icon} />
                    </span>
                    <span>{titulo}</span>
                </h2>

                {isProgresso && (
                    <div className="pedidos-resumo__card-enviados--progresso">
                        <motion.div
                            initial={{ height: "100%", width: 0 }}
                            animate={{
                                width: `${porcento}%`,
                                transition: { delay: 0.3 },
                            }}
                        ></motion.div>
                    </div>
                )}

                <div className="pedidos-resumo__card--infos">
                    <p>
                        {isProgresso ? (
                            descricao
                        ) : (
                            <motion.span>{desc}</motion.span>
                        )}
                    </p>
                </div>
            </div>
        );
    },
);
const PedidosRespostaShareModal = ({
    onClose,
    modeloId,
    link,
}: {
    onClose: () => void;
    modeloId?: string;
    link?: string;
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
                    <p>Compartilhar Formulário</p>
                </div>
                <button className="compartilhar-modal__close" onClick={onClose}>
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>

            <div
                className="compartilhar-modal__body"
                onClick={() => {
                    setCopy(true);
                    navigator.clipboard.writeText(
                        link
                            ? link
                            : `${window.location.origin}/pedidos/criar/${modeloId}`,
                    );
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
const BotaoRespostaSugestao = React.memo(
    ({ onSelect }: { onSelect: (opcao: string) => void }) => {
        const OPCOES = [
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
        const [isOpen, setIsOpen] = useState(false);
        return (
            <div className="pedidos-sugestao-button">
                <button
                    type="button"
                    title="Sugestão"
                    onClick={() => setIsOpen((v) => !v)}
                >
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
                            {OPCOES.map((v) => (
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
    },
);

const exportarCSV = (
    pedido: PedidosInterface & PedidosEstrutura,
    respostas: Map<string | number, PedidosRespostas[]>,
    rotulos: RotulosClassesInterface[],
    igrejas: IgrejaInterface[],
) => {
    const colunas: any = {
        "Tipo de Campo": "tipo",
        "Título do Campo": "titulo",
        Revista: "rotuloId",
        Tipo: "tipoRevista",
        Valor: "preco_unitario",
        Resposta: "resposta",
        "Valor Na Hora Do Envio": "preco_envio",
        Igreja: "igreja",
        "Enviado Por": "enviado",
        Email: "email",
        "Data Envio": "data",
    };
    const linhas: string[] = [];
    pedido.estrutura.forEach((v) => {
        v.campos.forEach((campo: any) => {
            respostas.get(campo.idKey)?.forEach((resp: any) => {
                const l = [];

                for (const key in colunas) {
                    const c = colunas[key];
                    switch (c) {
                        case "preco_envio":
                            l.push(
                                resp.estrutura[
                                    campo.idKey
                                ]?.preco_unitario?.toLocaleString("pt-BR"),
                            );
                            continue;
                        case "enviado":
                            l.push(resp.envido_por.nome);
                            continue;
                        case "email":
                            l.push(resp.envido_por.email);
                            continue;
                        case "resposta":
                            l.push(resp.estrutura[campo.idKey][c]);
                            continue;
                        case "rotuloId":
                            l.push(
                                rotulos.find((v) => v.id === campo.rotuloId)
                                    ?.name,
                            );
                            continue;
                        case "igreja":
                            l.push(
                                igrejas.find((v) => v.id === resp.igrejaId)
                                    ?.nome,
                            );
                            continue;
                        case "data":
                            l.push(
                                resp.data_resposta
                                    .toDate()
                                    .toLocaleDateString("pt-BR"),
                            );
                            continue;
                        case "preco_unitario":
                            l.push(campo[c]?.toLocaleString("pt-BR"));
                            continue;
                    }

                    l.push(campo[c]);
                }

                linhas.push(l.join(";"));
            });
        });
    });

    const csv = [Object.keys(colunas).join(";"), ...linhas].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = pedido.titulo;
    a.href = url;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const PedidosRespostasResumo = ({
    modeloId,
    pedido,
    rotulos,
}: {
    modeloId: string;
    pedido: PedidosInterface & PedidosEstrutura;
    rotulos: RotulosClassesInterface[];
}) => {
    const [respostas, setRespostas] =
        useState<Map<string | number, PedidosRespostas[]>>();
    const [totais, setTotais] =
        useState<
            Map<string | number, { total: number; totalRevistas: number }>
        >();
    const [igrejasEnviadas, setIgrejasEnviadas] = useState<string[]>([]);
    const [pesquisa, setPesquisa] = useState("");
    const [currentIgreja, setCurrentIgreja] = useState<IgrejaInterface | null>(
        null,
    );
    const [isEnviados, setIsEnviados] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const { igrejas } = useDataContext();
    const { user } = useAuthContext();

    const igrejasMemo = useMemo(() => {
        return new Map(igrejas.map((v) => [v.id, v]));
    }, [igrejas]);
    const estruturaMemo = useMemo(() => {
        if (!pesquisa) return pedido.estrutura;

        return pedido.estrutura.filter(
            (v) =>
                (v.titulo || "").toLowerCase().includes(pesquisa) ||
                v.campos.find((v) =>
                    (v.titulo || "").toLowerCase().includes(pesquisa),
                ),
        );
    }, [pedido, pesquisa]);

    useEffect(() => {
        const getRespostas = async () => {
            const respCll = collection(db, "pedidos_respostas");
            const q = query(
                respCll,
                where("modeloId", "==", modeloId),
                where("ministerioId", "==", user?.ministerioId),
            );
            const respDocs = await getDocs(q);

            if (respDocs.empty) return;

            const respMap = new Map();
            const totalMap = new Map();
            const igs: any = [];
            respDocs.docs.forEach((v) => {
                const data = { ...v.data(), id: v.id } as PedidosRespostas;
                igs.push(data.igrejaId);
                pedido.estrutura.forEach((v) => {
                    v.campos.forEach((v) => {
                        if (v.tipo === "revista") {
                            const ttl =
                                (data.estrutura[v.idKey]?.resposta as number) ||
                                0;
                            const p = ttl * v.preco_unitario;
                            const obj = totalMap.get(v.idKey) || {
                                total: 0,
                                totalRevistas: 0,
                            };
                            obj.total += p;
                            obj.totalRevistas += ttl;

                            totalMap.set(v.idKey, obj);
                        }

                        const obj = respMap.get(v.idKey) || [];
                        respMap.set(v.idKey, [...obj, data]);
                    });
                });
            });

            setRespostas(respMap);
            setTotais(totalMap);
            setIgrejasEnviadas(igs);
        };

        getRespostas().finally(() => setIsLoading(false));
    }, []);
    return (
        <div className="pedidos-resumo">
            <div className="pedidos-resumo__header">
                <div className="pedidos-resumo__title">
                    <h2>Respostas</h2>
                </div>
                <div className="pedidos-resumo__opcoes">
                    <div className="pedidos-resumo__tipo">
                        <div className="pedidos-resumo__tipo-enviados">
                            <label htmlFor="enviados-radio">Enviados</label>
                            <input
                                type="radio"
                                name="enviados"
                                id="enviados-radio"
                                defaultChecked
                                onChange={() => setIsEnviados(true)}
                            />
                        </div>

                        <div className="pedidos-resumo__tipo-pendentes">
                            <label htmlFor="nao-enviados-radio">
                                Pendentes
                            </label>
                            <input
                                type="radio"
                                name="enviados"
                                id="nao-enviados-radio"
                                onChange={() => setIsEnviados(false)}
                            />
                        </div>
                    </div>
                    <motion.button
                        onTap={() =>
                            exportarCSV(pedido, respostas!, rotulos, igrejas)
                        }
                        className="pedidos-resumo__csv"
                    >
                        <FontAwesomeIcon icon={faFileCsv} />
                    </motion.button>
                </div>
            </div>

            <div className="pedidos-resumo__cards">
                <PedidosRespostaCard
                    descricao={`${igrejasEnviadas.length} de ${igrejas.length} igrejas
                            responderam o formulário`}
                    porcento={
                        ((igrejasEnviadas.length || 0) / igrejas.length) * 100
                    }
                    titulo="Progresso Relatório"
                    type="enviados"
                    isProgresso
                    icon={faPercent}
                />
                <PedidosRespostaCard
                    descricao={Array.from(totais?.values() || []).reduce(
                        (prev, current) => current.totalRevistas + prev,
                        0,
                    )}
                    titulo="Total Revistas"
                    type="revistas"
                    isProgresso={false}
                    icon={faBookBookmark}
                />
                <PedidosRespostaCard
                    descricao={Array.from(totais?.values() || []).reduce(
                        (prev, current) => current.total + prev,
                        0,
                    )}
                    titulo="Valor Previsto"
                    type="total"
                    isProgresso={false}
                    icon={faMoneyBills}
                    isCurrency
                />
            </div>
            <LoadingModal isEnviando={isLoading} mensagem="Carregando" />
            {isEnviados ? (
                <div className="pedidos-resumo__body">
                    <div className="pedidos-resumo__filtros">
                        <div className="pedidos-resumo__filtros-pesquisa">
                            <SearchInput
                                onSearch={(v) => setPesquisa(v)}
                                texto="Seção"
                            />
                        </div>
                        <div className="pedidos-resumo__filtros-dropdown">
                            <Dropdown
                                current={currentIgreja?.nome || ""}
                                lista={igrejas}
                                onSelect={(v) => setCurrentIgreja(v)}
                                selectId={currentIgreja?.id}
                                isAll
                            />
                        </div>
                    </div>

                    <div className="pedidos-resumo__dados">
                        <div className="pedidos-resumo__secao">
                            <div className="pedidos-resumo__secao-titulo">
                                <h3>Enviado Por</h3>
                            </div>

                            <div className="pedidos-resumo__secao-inputs">
                                <PedidosRespostaInput
                                    igrejasMemo={igrejasMemo}
                                    item={estruturaMemo[0].campos[0]}
                                    respostasMap={respostas!}
                                    rotulos={rotulos}
                                    total={0}
                                    totalRevistas={0}
                                    preco={0}
                                    currentIgreja={currentIgreja}
                                    isEnviadoPor
                                />
                            </div>
                        </div>
                        {estruturaMemo.map((v, i) => (
                            <div key={i} className="pedidos-resumo__secao">
                                <div className="pedidos-resumo__secao-titulo">
                                    <h3>{v.titulo || `Seção ${i + 1}`}</h3>
                                </div>

                                <div className="pedidos-resumo__secao-inputs">
                                    {v.campos.map((v) => (
                                        <PedidosRespostaInput
                                            key={v.idKey}
                                            igrejasMemo={igrejasMemo}
                                            item={v}
                                            respostasMap={respostas!}
                                            rotulos={rotulos}
                                            total={
                                                totais?.get(v.idKey)?.total || 0
                                            }
                                            totalRevistas={
                                                totais?.get(v.idKey)
                                                    ?.totalRevistas || 0
                                            }
                                            preco={
                                                v.tipo === "revista"
                                                    ? v.preco_unitario
                                                    : 0
                                            }
                                            currentIgreja={currentIgreja}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="pedidos-resumo__nao-enviados">
                    {igrejas
                        .filter((v) => !igrejasEnviadas.includes(v.id))
                        .map((v) => (
                            <div
                                key={v.id}
                                className="pedidos-resumo__igreja-nao-enviada"
                            >
                                <p>{v.nome}</p>
                                <p>Pendente</p>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
};
const PedidosRespostaReferencia = ({
    referencia,
    rotulos,
}: {
    referencia: ClassesReferencia[];
    rotulos: RotulosClassesInterface[];
}) => {
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

                {referencia.length > 0 ? (
                    referencia.map((v) => (
                        <div
                            className="pedidos-referencia__classe"
                            key={v.classeId}
                        >
                            <div className="pedidos-referencia__classe-header">
                                <h4>{v.classeNome}</h4>
                                <div className="pedidos-referencia__classe-container">
                                    <p>
                                        {
                                            rotulos.find(
                                                (r) => r.id === v.rotuloId,
                                            )?.nome
                                        }
                                    </p>
                                    <p>{v.licaoAtual}</p>
                                </div>
                            </div>
                            <div className="pedidos-referencia__classe-body">
                                <div className="pedidos-referencia__classe-infos">
                                    <div className="pedidos-referencia__classe-profs">
                                        <h5>
                                            <i>
                                                <FontAwesomeIcon
                                                    icon={faChalkboardUser}
                                                />
                                            </i>
                                            <span>Total Professores</span>
                                        </h5>
                                        <p>{v.totalProfessores}</p>
                                    </div>
                                    <div className="pedidos-referencia__classe-matriculados">
                                        <h5>
                                            <i>
                                                <FontAwesomeIcon
                                                    icon={faUsers}
                                                />
                                            </i>
                                            <span>Total Matriculados</span>
                                        </h5>
                                        <p>{v.totalMatriculados}</p>
                                    </div>
                                    <div className="pedidos-referencia__classe-media">
                                        <h5>
                                            <i>
                                                <FontAwesomeIcon
                                                    icon={faPercent}
                                                />
                                            </i>
                                            <span>Média Presença</span>
                                        </h5>
                                        <p>{v.mediaPresenca}</p>
                                    </div>
                                    <div className="pedidos-referencia__classe-pico">
                                        <h5>
                                            <i>
                                                <FontAwesomeIcon
                                                    icon={faRankingStar}
                                                />
                                            </i>
                                            <span>
                                                Domingo com maior presença
                                            </span>
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
                                        {v.totalArrecadado.toLocaleString(
                                            "pt-BR",
                                            {
                                                currency: "BRL",
                                                style: "currency",
                                            },
                                        )}
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
    const PADRAO_REVISTAS = 2;
    const rotulo = rotulos.find((r) => value.rotuloId === r.id)!;
    const sugestaoObj = sugestao?.sugestoes?.[value.rotuloId];

    let sugestaoTotal = 0;
    if (opcaoSugestao && rotulo?.name !== "OUTRO") {
        const tipoRevista = value.tipoRevista.toLocaleLowerCase();
        if (tipoRevista.includes("professor"))
            sugestaoTotal = sugestaoObj?.totalProfessores || PADRAO_REVISTAS;
        if (tipoRevista.includes("aluno"))
            sugestaoTotal =
                (sugestaoObj as any)?.[opcaoSugestao] || PADRAO_REVISTAS;
    }
    return (
        <RevistaView
            preco={
                resposta && !isActive
                    ? resposta?.preco_unitario || 0
                    : value.preco_unitario
            }
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

function PedidosResposta() {
    const [isLoading, setIsLoading] = useState(true);
    const [isActive, setIsActive] = useState(true);
    const [share, setShare] = useState(false);
    const [rotulos, setRotulos] = useState<RotulosClassesInterface[]>([]);
    const [pedido, setPedido] = useState<
        (PedidosInterface & PedidosEstrutura) | null
    >(null);
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
            const q = query(
                rotulosCll,
                where("ministerioId", "==", user?.ministerioId),
            );
            const rotulosDocs = await getDocs(q);

            if (rotulosDocs.empty) return;

            const r = rotulosDocs.docs.map((v) => {
                const data = v.data() as RotulosClassesInterface;
                const idadeMinima =
                    data.idade_minima !== null ? `${data.idade_minima}` : "";
                const idadeMaxima =
                    data.idade_maxima !== null ? `${data.idade_maxima}` : "";
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
                where("igrejaId", "==", user?.igrejaId),
                where("modeloId", "==", modeloId),
            );

            const [pedidoDocs, pedidoRespostaDocs] = await Promise.all([
                getDocs(q1),
                getDocs(q2),
            ]);

            if (pedidoDocs.empty) return navigate("/pedidos");
            if (!pedidoRespostaDocs.empty)
                setResposta(
                    pedidoRespostaDocs.docs[0].data() as PedidosRespostas,
                );

            const p = {
                id: pedidoDocs.docs[0].id,
                ...(pedidoDocs.docs[0].data() as PedidosInterface),
            };
            if (p.tipo === "modelo") return navigate("/pedidos");
            const estruturaCll = doc(
                db,
                "pedidos",
                modeloId!,
                "estrutura",
                "dados",
            );
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
                where("igrejaId", "==", user?.igrejaId!),
                where("data_inicio", "<=", new Date()),
                where("data_fim", ">=", new Date()),
            );

            const usuariosD = doc(db, "cache_usuarios", user?.igrejaId!);

            const [cacheLicoesDocs, usuariosDocs] = await Promise.all([
                getDocs(q),
                getDoc(usuariosD),
            ]);

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
                    listaPresenca.reduce(
                        (prev, current) => current.total_presenca + prev,
                        0,
                    ) / listaPresenca.length || 1,
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
                if (sugestaoMap.has(id)) {
                    console.log("entrei aqui");

                    const ref = classesReferenciaMap.get(id);
                    const sug = sugestaoMap.get(ref?.rotuloId);
                    sugestaoMap.set(ref?.rotuloId, {
                        ...sug,
                        totalProfessores: sug.totalProfessores + 1,
                    });
                    classesReferenciaMap.set(id, {
                        ...ref,
                        totalProfessores: ref?.totalProfessores || 0 + 1,
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
                .catch((v) => console.log("deu esse erro", v))
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
                        <button
                            title="voltar"
                            onClick={() => navigate("/pedidos?redirect=false")}
                        >
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
                                <button
                                    title="Editar"
                                    onClick={() =>
                                        navigate(`/pedidos/criar/${modeloId}`)
                                    }
                                >
                                    <FontAwesomeIcon icon={faPenToSquare} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="pedidos-resposta__header-abas">
                        <div
                            className={`pedidos-resposta__header-aba ${type === "referencia" ? "active" : ""}`}
                            onClick={() =>
                                navigate(
                                    `/pedidos/formulario/${modeloId}/referencia`,
                                )
                            }
                        >
                            <p>Referência</p>
                        </div>
                        <div
                            className={`pedidos-resposta__header-aba ${type !== "resposta" && type !== "referencia" ? "active" : ""}`}
                            onClick={() =>
                                navigate(`/pedidos/formulario/${modeloId}`)
                            }
                        >
                            <p>Resumo</p>
                        </div>
                        {isSuperAdmin.current && (
                            <div
                                className={`pedidos-resposta__header-aba ${type === "resposta" ? "active" : ""}`}
                                onClick={() =>
                                    navigate(
                                        `/pedidos/formulario/${modeloId}/resposta`,
                                    )
                                }
                            >
                                <p>Respostas</p>
                            </div>
                        )}
                    </div>
                </div>

                {type === "resposta" && isSuperAdmin.current ? (
                    <PedidosRespostasResumo
                        modeloId={modeloId || ""}
                        pedido={pedido!}
                        rotulos={rotulos}
                    />
                ) : type === "referencia" ? (
                    <PedidosRespostaReferencia
                        referencia={referencia}
                        rotulos={rotulos}
                    />
                ) : (
                    <FormProvider {...methods}>
                        <form
                            className="pedidos-resposta__form"
                            onSubmit={handleSubmit(onSubmit)}
                        >
                            {resposta ? (
                                <div className="pedidos-resposta__form-ja-enviado">
                                    <span>
                                        <FontAwesomeIcon icon={faCircleCheck} />
                                    </span>
                                    <p>
                                        Formulário enviado dia{" "}
                                        <span>
                                            {resposta.data_resposta
                                                .toDate()
                                                .toLocaleDateString("pt-BR")}
                                        </span>
                                    </p>
                                </div>
                            ) : (
                                <div className="pedidos-resposta__form-sugestao">
                                    <BotaoRespostaSugestao
                                        onSelect={addSugestao}
                                    />
                                </div>
                            )}

                            <div className="pedidos-resposta__form-title">
                                <h2>{pedido?.titulo}</h2>

                                <div className="pedidos-resposta__form-datas">
                                    <div className="pedidos-resposta__form-data">
                                        <p>
                                            <span>
                                                <FontAwesomeIcon
                                                    icon={faCalendar}
                                                />
                                            </span>
                                            <span>Abertura</span>
                                        </p>
                                        <data
                                            value={pedido?.data_inicio
                                                .toDate()
                                                .toLocaleDateString("pt-BR")}
                                        >
                                            {pedido?.data_inicio
                                                .toDate()
                                                .toLocaleDateString("pt-BR")}
                                        </data>
                                    </div>

                                    <div className="pedidos-resposta__form-data">
                                        <p>
                                            <span>
                                                <FontAwesomeIcon
                                                    icon={faCalendar}
                                                />
                                            </span>
                                            <span>Encerramento</span>
                                        </p>
                                        <data
                                            value={pedido?.data_fim
                                                ?.toDate()
                                                .toLocaleDateString("pt-BR")}
                                        >
                                            {pedido?.data_fim
                                                ?.toDate()
                                                .toLocaleDateString("pt-BR")}
                                        </data>
                                    </div>
                                </div>

                                {pedido?.descricao && (
                                    <p>{pedido?.descricao}</p>
                                )}
                            </div>

                            <div className="pedidos-resposta__form-secoes">
                                {pedido?.estrutura.map((v, i) => (
                                    <div
                                        key={v.idKey || i}
                                        className="pedidos-resposta__form__secao"
                                    >
                                        {v.titulo && (
                                            <div className="pedidos-resposta__form__secao-titulo">
                                                <h3>{v.titulo}</h3>
                                            </div>
                                        )}

                                        <div className="pedidos-resposta__form__secao-inputs">
                                            {v.campos.map((v) => {
                                                const resp = resposta
                                                    ? (resposta.estrutura[
                                                          v.idKey
                                                      ] as any)
                                                    : undefined;
                                                if (v.tipo === "revista") {
                                                    return (
                                                        <RevistaRender
                                                            control={control}
                                                            setFocus={setFocus}
                                                            setValue={setValue}
                                                            isActive={isActive}
                                                            opcaoSugestao={
                                                                opcaoSugestao
                                                            }
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
                                                                required:
                                                                    v.obrigatorio,
                                                                path: `respostas.${v.idKey}`,
                                                                defaultValue:
                                                                    resp?.resposta ||
                                                                    "",
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
                {share && (
                    <PedidosRespostaShareModal
                        modeloId={modeloId || ""}
                        onClose={() => setShare(false)}
                    />
                )}
            </AnimatePresence>
            <AlertModal isOpen={!!mensagem} {...mensagem!} />
        </>
    );
}

export { PedidosRespostaShareModal };
export default PedidosResposta;
