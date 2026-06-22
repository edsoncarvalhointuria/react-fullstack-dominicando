import { memo, useEffect, useMemo, useState } from "react";
import type {
    PedidosEstrutura,
    PedidosInterface,
    PedidosRespostas,
    RevistaType,
    TextType,
} from "../../../interfaces/PedidosInterface";
import { useDataContext } from "../../../context/DataContext";
import { useAuthContext } from "../../../context/AuthContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../utils/firebase";
import { animate, AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faAngleDown,
    faBookBookmark,
    faFileCsv,
    faHandHoldingDollar,
    faMoneyBills,
    faPercent,
} from "@fortawesome/free-solid-svg-icons";
import LoadingModal from "../../layout/loading/LoadingModal";
import SearchInput from "../../ui/SearchInput";
import Dropdown from "../../ui/Dropdown";

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
                            l.push(resp.estrutura[campo.idKey]?.preco_unitario?.toLocaleString("pt-BR"));
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
                            l.push(rotulos.find((v) => v.id === campo.rotuloId)?.name);
                            continue;
                        case "igreja":
                            l.push(igrejas.find((v) => v.id === resp.igrejaId)?.nome);
                            continue;
                        case "data":
                            l.push(resp.data_resposta.toDate().toLocaleDateString("pt-BR"));
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
const PedidosRespostaIgreja = memo(
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
                                    (igreja.estrutura?.[item.idKey].resposta as number) * item.preco_unitario
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
const PedidosRespostaInput = memo(
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
                    <motion.span animate={{ rotate: isOpen ? 0 : -90 }} initial={{ rotate: 0 }}>
                        <FontAwesomeIcon icon={faAngleDown} />
                    </motion.span>
                    <h4>{titulo}</h4>
                </div>
            );
        };
        const InpValor = ({ icon, titulo }: { icon: any; titulo: string | number }) => {
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
            const i = respostasMap?.get(item.idKey)?.find((v) => v.igrejaId === currentIgreja.id);
            return i ? [i] : [];
        }, [currentIgreja, respostasMap]);

        return (
            <div className="pedidos-resumo__secao-input">
                <motion.div className="pedidos-resumo__secao-input__infos" onTap={() => setIsOpen((v) => !v)}>
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
                                <InpValor icon={faBookBookmark} titulo={totalRevistas} />

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
                                        nomeIgreja={igrejasMemo.get(i.igrejaId)?.nome || ""}
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
const PedidosRespostaCard = memo(
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
                    <p>{isProgresso ? descricao : <motion.span>{desc}</motion.span>}</p>
                </div>
            </div>
        );
    },
);
export default function PedidosRespostasResumo({
    modeloId,
    pedido,
    rotulos,
}: {
    modeloId: string;
    pedido: PedidosInterface & PedidosEstrutura;
    rotulos: RotulosClassesInterface[];
}) {
    const [respostas, setRespostas] = useState<Map<string | number, PedidosRespostas[]>>();
    const [totais, setTotais] = useState<Map<string | number, { total: number; totalRevistas: number }>>();
    const [igrejasEnviadas, setIgrejasEnviadas] = useState<string[]>([]);
    const [pesquisa, setPesquisa] = useState("");
    const [currentIgreja, setCurrentIgreja] = useState<IgrejaInterface | null>(null);
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
                v.campos.find((v) => (v.titulo || "").toLowerCase().includes(pesquisa)),
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
                            const ttl = (data.estrutura[v.idKey]?.resposta as number) || 0;
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
                            <label htmlFor="nao-enviados-radio">Pendentes</label>
                            <input
                                type="radio"
                                name="enviados"
                                id="nao-enviados-radio"
                                onChange={() => setIsEnviados(false)}
                            />
                        </div>
                    </div>
                    <motion.button
                        onTap={() => exportarCSV(pedido, respostas!, rotulos, igrejas)}
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
                    porcento={((igrejasEnviadas.length || 0) / igrejas.length) * 100}
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
                    descricao={Array.from(totais?.values() || []).reduce((prev, current) => current.total + prev, 0)}
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
                            <SearchInput onSearch={setPesquisa} texto="Seção" />
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
                                            total={totais?.get(v.idKey)?.total || 0}
                                            totalRevistas={totais?.get(v.idKey)?.totalRevistas || 0}
                                            preco={v.tipo === "revista" ? v.preco_unitario : 0}
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
                            <div key={v.id} className="pedidos-resumo__igreja-nao-enviada">
                                <p>{v.nome}</p>
                                <p>Pendente</p>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
}
