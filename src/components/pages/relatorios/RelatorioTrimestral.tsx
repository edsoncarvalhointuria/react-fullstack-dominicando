import { AnimatePresence, motion, type Variants } from "framer-motion";
import "./relatorio-trimestral.scss";
import {
    faAngleRight,
    faCalendar,
    faFilePdf,
    faFileZipper,
    faLockOpen,
    faMoneyBill,
    faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Dropdown from "../../ui/Dropdown";
import { useEffect, useState, type ReactNode } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../../../utils/firebase";
import { useDataContext } from "../../../context/DataContext";
import Loading from "../../layout/loading/Loading";
import { useAuthContext } from "../../../context/AuthContext";
import { faPix } from "@fortawesome/free-brands-svg-icons";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { getFunctions, httpsCallable } from "firebase/functions";
import AlertModal from "../../ui/AlertModal";
import ConfirmacaoModal from "../../ui/ConfirmacaoModal";
import type { TrimestresInterface } from "../../../interfaces/TrimestresInterface";
import type { RelatoriosTrimestresInterface } from "../../../interfaces/RelatoriosTrimestresInterface";
import RelatorioTrimestralDownload from "./RelatorioTrimestralDownload";

interface DadosAcordeaoClasse {
    id: string;
    licaoId: string;
    igrejaId: string;
    nome: string;
    total: number;
    total_ofertas_pix: number;
    total_ofertas_dinheiro: number;
    total_missoes_pix: number;
    total_missoes_dinheiro: number;
    comprovantes: string[];
}

interface DadosAcordeao {
    aula: number;
    data: string;
    total: number;
    realizada: boolean;
    total_ofertas_pix: number;
    total_ofertas_dinheiro: number;
    total_missoes_pix: number;
    total_missoes_dinheiro: number;
    classes: DadosAcordeaoClasse[];
}

interface DadosTrimestre {
    bloqueado: boolean;
    relatorio: RelatoriosTrimestresInterface;
    datas: DadosAcordeao[];
    resumo_final: {
        total: number;
        total_ofertas_pix: number;
        total_ofertas_dinheiro: number;
        total_missoes_pix: number;
        total_missoes_dinheiro: number;
    };
}

const variantsAcordeao: Variants = {
    initial: { height: 0, padding: "0" },
    animate: { height: "auto", padding: "1.5rem" },
    exit: { height: 0, padding: 0 },
};

const baixarImagem = (url: any) => {
    try {
        const a = document.createElement("a");
        a.href = url;
        a.download = "comprovante.jpg";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (Error) {
        console.log("deu esse erro", Error);
    }
};

const baixarZip = async (nome: string, base64: any) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const arquivo = new Uint8Array(byteNumbers);

    const blob = new Blob([arquivo], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const functions = getFunctions();
const getRelatorioTrimestral = httpsCallable(
    functions,
    "getRelatorioTrimestral"
);
const desbloquearRelatorio = httpsCallable(functions, "desbloquearRelatorio");
const baixarTodosComprovantes = httpsCallable(
    functions,
    "baixarTodosComprovantes"
);

const AcordeaoEnviado = ({
    relatorio,
}: {
    relatorio: RelatoriosTrimestresInterface;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const data = relatorio.data_envio as any;
    return (
        <motion.div className="relatorio-enviado">
            <motion.div
                className="relatorio-enviado__header"
                onTap={() => setIsOpen((v) => !v)}
            >
                <div className="relatorio-enviado__title">
                    <motion.span
                        initial={{ rotate: 0 }}
                        animate={{ rotate: isOpen ? 90 : 0 }}
                    >
                        <FontAwesomeIcon icon={faAngleRight} />
                    </motion.span>
                    <h3>Enviado</h3>
                </div>

                <div className="relatorio-enviado__header-data">
                    <data value={data}>{data}</data>
                </div>
            </motion.div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key={"acordeao-dados"}
                        className="relatorio-enviado__infos"
                        variants={variantsAcordeao}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.2, ease: "linear" }}
                    >
                        <div className="relatorio-enviado__info">
                            <p>
                                Assinado por:{" "}
                                <strong>{relatorio.assinado_por.nome}</strong>
                            </p>
                        </div>
                        <div className="relatorio-enviado__info">
                            <p>
                                Email:{" "}
                                <strong>{relatorio.assinado_por.email}</strong>
                            </p>
                        </div>
                        {relatorio.descricao && (
                            <div className="relatorio-enviado__info">
                                <p>
                                    Justificativa:{" "}
                                    <strong>{relatorio.descricao}</strong>
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
const AcordeaoClasse = ({
    classe,
    open,
    onEdit,
}: {
    classe: DadosAcordeaoClasse;
    open: boolean;
    onEdit: () => void;
}) => {
    return (
        <div className="relatorio-classe">
            <div className="relatorio-classe__header">
                <div className="relatorio-classe__title">
                    <motion.span
                        animate={open ? { rotate: 90 } : { rotate: 0 }}
                    >
                        <FontAwesomeIcon icon={faAngleRight} />
                    </motion.span>
                    <h3>{classe.nome}</h3>
                </div>

                <div className="relatorio-classe__header-total">
                    {classe.total.toLocaleString("pt-BR", {
                        currency: "BRL",
                        style: "currency",
                    })}
                </div>
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        key={"acordeao-classe-os"}
                        className="relatorio-classe__body"
                        variants={variantsAcordeao}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.5 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relatorio-classes__totais">
                            <div className="relatorio-classes__total">
                                <h4>Missões</h4>
                                <div className="relatorio-classes__valor">
                                    <span>
                                        <FontAwesomeIcon icon={faMoneyBill} />
                                    </span>
                                    <p>
                                        {classe.total_missoes_dinheiro.toLocaleString(
                                            "pt-BR",
                                            {
                                                currency: "BRL",
                                                style: "currency",
                                            }
                                        )}
                                    </p>
                                </div>
                                <div className="relatorio-classes__valor">
                                    <span>
                                        <FontAwesomeIcon icon={faPix} />
                                    </span>
                                    <p>
                                        {classe.total_missoes_pix.toLocaleString(
                                            "pt-BR",
                                            {
                                                currency: "BRL",
                                                style: "currency",
                                            }
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="relatorio-classes__total">
                                <h4>Ofertas</h4>
                                <div className="relatorio-classes__valor">
                                    <span>
                                        <FontAwesomeIcon icon={faMoneyBill} />
                                    </span>
                                    <p>
                                        {classe.total_ofertas_dinheiro.toLocaleString(
                                            "pt-BR",
                                            {
                                                currency: "BRL",
                                                style: "currency",
                                            }
                                        )}
                                    </p>
                                </div>
                                <div className="relatorio-classes__valor">
                                    <span>
                                        <FontAwesomeIcon icon={faPix} />
                                    </span>
                                    <p>
                                        {classe.total_ofertas_pix.toLocaleString(
                                            "pt-BR",
                                            {
                                                currency: "BRL",
                                                style: "currency",
                                            }
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="relatorio-classes__editar">
                                <button onClick={onEdit}>Editar Aula</button>
                            </div>
                        </div>

                        <div className="relatorio-classes__imgs">
                            <div className="relatorio-classes__imgs--add">
                                <label htmlFor={`adicionar-img-${classe.id}`}>
                                    Comprovantes
                                </label>
                            </div>

                            {classe.comprovantes.map((v, i) => (
                                <motion.div
                                    className="relatorio-classes__img"
                                    key={`${classe.id}-${i}`}
                                    onTap={() => {
                                        baixarImagem(v);
                                    }}
                                >
                                    <img src={v} alt="Imagem comprovante" />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
const Acordeao = ({ data }: { data: DadosAcordeao }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isOpenClasse, setIsOpenClasse] = useState(-1);
    const navigate = useNavigate();

    return (
        <motion.div className="relatorio-acordeao">
            <motion.div
                className="relatorio-acordeao__header"
                onTap={() => setIsOpen((v) => !v)}
            >
                <div className="relatorio-acordeao__title">
                    <motion.span
                        initial={{ rotate: 0 }}
                        animate={{ rotate: isOpen ? 90 : 0 }}
                    >
                        <FontAwesomeIcon icon={faAngleRight} />
                    </motion.span>
                    <h3>{`${data.aula} (${data.data})`}</h3>
                </div>

                <div className="relatorio-acordeao__header-total">
                    {data.realizada ? (
                        data.total.toLocaleString("pt-BR", {
                            currency: "BRL",
                            style: "currency",
                        })
                    ) : (
                        <p className="relatorio-acordeao__nao-realizada">
                            Sem registro
                        </p>
                    )}
                </div>
            </motion.div>

            <AnimatePresence>
                {isOpen && data.realizada && (
                    <motion.div
                        key={"acordeao"}
                        className="relatorio-acordeao__classes"
                        variants={variantsAcordeao}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.5 }}
                    >
                        <div className="relatorio-acordeao__classes-totais">
                            <div className="relatorio-acordeao__classes-total">
                                <h4>Missões</h4>
                                <div className="relatorio-acordeao__classes-valor">
                                    <span>
                                        <FontAwesomeIcon icon={faMoneyBill} />
                                    </span>
                                    <p>
                                        {data.total_missoes_dinheiro.toLocaleString(
                                            "pt-BR",
                                            {
                                                currency: "BRL",
                                                style: "currency",
                                            }
                                        )}
                                    </p>
                                </div>
                                <div className="relatorio-acordeao__classes-valor">
                                    <span>
                                        <FontAwesomeIcon icon={faPix} />
                                    </span>
                                    <p>
                                        {data.total_missoes_pix.toLocaleString(
                                            "pt-BR",
                                            {
                                                currency: "BRL",
                                                style: "currency",
                                            }
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="relatorio-acordeao__classes-total">
                                <h4>Ofertas</h4>
                                <div className="relatorio-acordeao__classes-valor">
                                    <span>
                                        <FontAwesomeIcon icon={faMoneyBill} />
                                    </span>
                                    <p>
                                        {data.total_ofertas_dinheiro.toLocaleString(
                                            "pt-BR",
                                            {
                                                currency: "BRL",
                                                style: "currency",
                                            }
                                        )}
                                    </p>
                                </div>
                                <div className="relatorio-acordeao__classes-valor">
                                    <span>
                                        <FontAwesomeIcon icon={faPix} />
                                    </span>
                                    <p>
                                        {data.total_ofertas_pix.toLocaleString(
                                            "pt-BR",
                                            {
                                                currency: "BRL",
                                                style: "currency",
                                            }
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="relatorio-acordeao__lista">
                            {data.classes
                                .sort((a, b) => a.nome.localeCompare(b.nome))
                                .map((v, i) => (
                                    <motion.div
                                        key={v.id}
                                        onClick={() =>
                                            setIsOpenClasse((c) =>
                                                c === i ? -1 : i
                                            )
                                        }
                                    >
                                        <AcordeaoClasse
                                            classe={v}
                                            open={isOpenClasse === i}
                                            onEdit={() =>
                                                navigate(
                                                    `/aulas/${v.igrejaId}/${v.id}/${v.licaoId}/${data.aula}`
                                                )
                                            }
                                        />
                                    </motion.div>
                                ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

function RelatorioTrimestral() {
    const [igrejasEnviados, setIgrejasEnviados] = useState<
        (RelatoriosTrimestresInterface & { igrejaNome: string })[]
    >([]);
    const [igrejasNaoEnviados, setIgrejasNaoEnviados] = useState<
        (RelatoriosTrimestresInterface & { igrejaNome: string })[]
    >([]);
    const [trimestres, setTrimestres] = useState<TrimestresInterface[]>([]);
    const [currentTrimestre, setCurrentTrimestre] =
        useState<TrimestresInterface | null>(null);
    const [loadingTrimestres, setLoadingTrimestres] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [enviar, setEnviar] = useState(false);
    const [downloadRelatorio, setDownloadRelatorio] = useState(false);
    const [dadosTrimestre, setDadosTrimestre] = useState<DadosTrimestre | null>(
        null
    );
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

    const navigate = useNavigate();
    const { igrejaId } = useParams();
    const { user, isSecretario, isSuperAdmin } = useAuthContext();
    const { isLoadingData, igrejas } = useDataContext();

    useEffect(() => {
        const getRelatorio = async (igrejaId: string) => {
            setIsLoading(true);
            try {
                const { data } = await getRelatorioTrimestral({
                    igrejaId: igrejaId,
                    trimestreId: currentTrimestre?.id,
                });
                const dados = data as DadosTrimestre;

                setDadosTrimestre(dados);
            } catch (err: any) {
                setMensagem({
                    cancelText: "Cancelar",
                    confirmText: "Ok",
                    message: err.message,
                    onCancel: () => setMensagem(null),
                    onClose: () => setMensagem(null),
                    onConfirm: () => setMensagem(null),
                    title: "Houve um Erro",
                    icon: <FontAwesomeIcon icon={faTriangleExclamation} />,
                });
            } finally {
                setIsLoading(false);
            }
        };
        const getIgrejas = async () => {
            setIsLoading(true);
            const igrejasColl = collection(db, "relatorios_trimestre");
            const q = query(
                igrejasColl,
                where("ministerioId", "==", user?.ministerioId),
                where("data_inicio", "==", currentTrimestre?.data_inicio),
                where("data_fim", "==", currentTrimestre?.data_fim),
                where("bloqueado", "==", true)
            );
            const igrejasDocs = await getDocs(q);
            const igrejasMap = new Map();
            const igrejasNaoEnviados: any = [];
            const igrejasEnviados: any = [];

            igrejasDocs.forEach((v) => {
                const igreja = v.data() as RelatoriosTrimestresInterface;
                igrejasMap.set(igreja.igrejaId, igreja);
            });

            igrejas.forEach((v) => {
                const igrejaNome = v.nome;
                const igrejaId = v.id;
                const igreja = igrejasMap.get(v.id);
                if (igreja)
                    igrejasEnviados.push({
                        ...igrejasMap.get(v.id),
                        igrejaNome,
                    });
                else
                    igrejasNaoEnviados.push({
                        igrejaNome,
                        igrejaId,
                        bloqueado: false,
                    });
            });

            setIgrejasEnviados(igrejasEnviados);
            setIgrejasNaoEnviados(igrejasNaoEnviados);
            setIsLoading(false);
        };

        if (currentTrimestre) {
            if (isSuperAdmin.current && !igrejaId) {
                getIgrejas();
            } else
                getRelatorio(
                    isSuperAdmin.current ? igrejaId! : user!.igrejaId!
                );
        }
    }, [currentTrimestre, igrejaId]);
    useEffect(() => {
        const getTrimestres = async () => {
            setLoadingTrimestres(true);
            const trimestresC = collection(db, "trimestres");
            const q = query(
                trimestresC,
                where("ministerioId", "==", user?.ministerioId),
                limit(100)
            );
            const trimestresDocs = await getDocs(q);

            if (trimestresDocs.empty) return [];

            const trimestres = trimestresDocs.docs.map((v) => {
                const data = { id: v.id, ...v.data() } as TrimestresInterface;
                const nome = `${data.numero_trimestre}º Trimestre de ${
                    data.ano
                } (${data.data_inicio
                    .toDate()
                    .toLocaleDateString("pt-BR")} - ${data.data_fim
                    .toDate()
                    .toLocaleDateString("pt-BR")})`;
                return { ...data, nome };
            });

            return trimestres.sort(
                (a, b) =>
                    b.data_inicio.toDate().getTime() -
                    a.data_inicio.toDate().getTime()
            );
        };

        if (user) {
            getTrimestres()
                .then(setTrimestres)
                .catch((err) =>
                    setMensagem({
                        cancelText: "Cancelar",
                        confirmText: "Ok",
                        message: err.message,
                        onCancel: () => setMensagem(null),
                        onClose: () => setMensagem(null),
                        onConfirm: () => setMensagem(null),
                        title: "Houve um Erro",
                        icon: <FontAwesomeIcon icon={faTriangleExclamation} />,
                    })
                )
                .finally(() => setLoadingTrimestres(false));
        }
    }, [user]);
    if (isLoadingData || isLoading) return <Loading />;
    if (isSecretario.current) return <Navigate to={"/relatorios"} />;
    return (
        <>
            <div className="relatorio-trimestral">
                <div className="relatorio-trimestral__header">
                    <div className="relatorio-trimestral__title">
                        <h2>
                            Relatório{" "}
                            {igrejaId
                                ? igrejas.find((v) => igrejaId == v.id)?.nome
                                : "Trimestral"}
                        </h2>
                        {currentTrimestre ? (
                            <p className="relatorio-trimestral__title--data">
                                <span>
                                    <FontAwesomeIcon icon={faCalendar} />
                                </span>
                                {currentTrimestre.data_inicio
                                    .toDate()
                                    .toLocaleDateString("pt-BR")}{" "}
                                -{" "}
                                {currentTrimestre.data_fim
                                    .toDate()
                                    .toLocaleDateString("pt-BR")}
                            </p>
                        ) : (
                            <p className="relatorio-trimestral__title--vazio">
                                <span>
                                    <FontAwesomeIcon icon={faCalendar} />
                                </span>
                                Data não selecionada
                            </p>
                        )}
                    </div>

                    <div className="relatorio-trimestral__filtro">
                        <Dropdown
                            current={currentTrimestre?.nome || null}
                            lista={trimestres}
                            onSelect={(v) => setCurrentTrimestre(v)}
                            isAll={false}
                            isLoading={loadingTrimestres}
                            selectId={currentTrimestre?.id}
                        />
                    </div>
                </div>

                <div className="relatorio-trimestral__body">
                    {isSuperAdmin.current && !igrejaId && currentTrimestre ? (
                        <div className="relatorio-trimestral__igrejas">
                            {igrejasEnviados.length > 0 && (
                                <div className="relatorio-trimestral__igrejas-enviados">
                                    {igrejasEnviados
                                        .filter((v) => v.bloqueado)
                                        .map((v) => (
                                            <div
                                                key={v.igrejaId}
                                                className="relatorio-trimestral__igreja"
                                                onClick={() =>
                                                    navigate(v.igrejaId)
                                                }
                                            >
                                                <h3>{v.igrejaNome}</h3>

                                                <div className="relatorio-trimestral__igreja-dados">
                                                    <p className="relatorio-trimestral__igreja-data">
                                                        Enviado em:{" "}
                                                        <data
                                                            value={v.data_envio
                                                                .toDate()
                                                                .toLocaleDateString(
                                                                    "pt-BR"
                                                                )}
                                                        >
                                                            {v.data_envio
                                                                .toDate()
                                                                .toLocaleDateString(
                                                                    "pt-BR"
                                                                )}
                                                        </data>
                                                    </p>

                                                    <p className="relatorio-trimestral__igreja-assinatura">
                                                        Enviado por:
                                                        <span>
                                                            {
                                                                v.assinado_por.nome.split(
                                                                    " "
                                                                )[0]
                                                            }
                                                        </span>
                                                    </p>

                                                    <p className="relatorio-trimestral__igreja-total">
                                                        {v.valor_enviado.toLocaleString(
                                                            "pt-BR",
                                                            {
                                                                currency: "BRL",
                                                                style: "currency",
                                                            }
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                            {igrejasNaoEnviados.length > 0 && (
                                <div className="relatorio-trimestral__igrejas-nao-enviados">
                                    {igrejasNaoEnviados
                                        .filter((v) => !v.bloqueado)
                                        .map((v) => (
                                            <div
                                                key={v.igrejaId}
                                                className="relatorio-trimestral__igreja"
                                                onClick={() =>
                                                    navigate(v.igrejaId)
                                                }
                                            >
                                                <h3>{v.igrejaNome}</h3>

                                                <div className="relatorio-trimestral__igreja-dados">
                                                    <p className="relatorio-trimestral__igreja-pendente">
                                                        Pendente
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    ) : dadosTrimestre !== null ? (
                        <>
                            {dadosTrimestre.bloqueado && (
                                <div className="relatorio-trimestral__enviado">
                                    <AcordeaoEnviado
                                        relatorio={dadosTrimestre.relatorio}
                                    />
                                </div>
                            )}

                            <div className="relatorio-trimestral__acordeoes">
                                {dadosTrimestre.datas.length > 0 ? (
                                    dadosTrimestre.datas
                                        .sort((a, b) => a.aula - b.aula)
                                        .map((v, i) => (
                                            <Acordeao data={v} key={i} />
                                        ))
                                ) : (
                                    <div className="relatorio-trimestral__vazio">
                                        <p>
                                            Não existem registros nesse
                                            trimestre.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="relatorio-trimestral__resumo">
                                <div className="relatorio-trimestral__resumo-totais">
                                    <div className="relatorio-trimestral__resumo-total">
                                        <h4>Missões</h4>
                                        <div className="relatorio-trimestral__resumo-valor">
                                            <span>
                                                <FontAwesomeIcon
                                                    icon={faMoneyBill}
                                                />
                                            </span>
                                            <p>
                                                {dadosTrimestre.resumo_final.total_missoes_dinheiro.toLocaleString(
                                                    "pt-BR",
                                                    {
                                                        currency: "BRL",
                                                        style: "currency",
                                                    }
                                                )}
                                            </p>
                                        </div>
                                        <div className="relatorio-trimestral__resumo-valor">
                                            <span>
                                                <FontAwesomeIcon icon={faPix} />
                                            </span>
                                            <p>
                                                {dadosTrimestre.resumo_final.total_missoes_pix.toLocaleString(
                                                    "pt-BR",
                                                    {
                                                        currency: "BRL",
                                                        style: "currency",
                                                    }
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="relatorio-trimestral__resumo-total">
                                        <h4>Ofertas</h4>
                                        <div className="relatorio-trimestral__resumo-valor">
                                            <span>
                                                <FontAwesomeIcon
                                                    icon={faMoneyBill}
                                                />
                                            </span>
                                            <p>
                                                {dadosTrimestre.resumo_final.total_ofertas_dinheiro.toLocaleString(
                                                    "pt-BR",
                                                    {
                                                        currency: "BRL",
                                                        style: "currency",
                                                    }
                                                )}
                                            </p>
                                        </div>
                                        <div className="relatorio-trimestral__resumo-valor">
                                            <span>
                                                <FontAwesomeIcon icon={faPix} />
                                            </span>
                                            <p>
                                                {dadosTrimestre.resumo_final.total_ofertas_pix.toLocaleString(
                                                    "pt-BR",
                                                    {
                                                        currency: "BRL",
                                                        style: "currency",
                                                    }
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="relatorio-trimestral__resumo-total_geral">
                                    {dadosTrimestre.bloqueado &&
                                    dadosTrimestre.relatorio.valor_enviado !==
                                        Number(
                                            dadosTrimestre.resumo_final.total.toFixed(
                                                2
                                            )
                                        ) ? (
                                        <>
                                            <div className="relatorio-trimestral__resumo-total-calculado">
                                                <p>Total Calculado</p>
                                                <h3>
                                                    {dadosTrimestre.resumo_final.total.toLocaleString(
                                                        "pt-BR",
                                                        {
                                                            currency: "BRL",
                                                            style: "currency",
                                                        }
                                                    )}
                                                </h3>
                                            </div>

                                            <div className="relatorio-trimestral__resumo-total-enviado">
                                                <p>Total Enviado</p>
                                                <h3>
                                                    {dadosTrimestre.relatorio.valor_enviado.toLocaleString(
                                                        "pt-BR",
                                                        {
                                                            currency: "BRL",
                                                            style: "currency",
                                                        }
                                                    )}
                                                </h3>
                                            </div>
                                        </>
                                    ) : (
                                        <h3>
                                            {dadosTrimestre.resumo_final.total.toLocaleString(
                                                "pt-BR",
                                                {
                                                    currency: "BRL",
                                                    style: "currency",
                                                }
                                            )}
                                        </h3>
                                    )}
                                </div>
                                <div className="relatorio-trimestral__resumo-buttons">
                                    <motion.button
                                        title="Baixar Recibo"
                                        onTap={() => setDownloadRelatorio(true)}
                                        disabled={downloadRelatorio}
                                    >
                                        <span>
                                            <FontAwesomeIcon icon={faFilePdf} />
                                        </span>
                                        Recibo
                                    </motion.button>
                                    <motion.button
                                        title="Baixar Comprovantes Pix"
                                        onTap={() => {
                                            setIsLoading(true);
                                            const imagens =
                                                dadosTrimestre.datas.flatMap(
                                                    (v) =>
                                                        v.classes.flatMap(
                                                            (v) =>
                                                                v.comprovantes
                                                        )
                                                );

                                            if (imagens.length) {
                                                baixarTodosComprovantes({
                                                    igrejaId:
                                                        igrejaId ||
                                                        user?.igrejaId,
                                                    dados: imagens,
                                                })
                                                    .then(({ data }) => {
                                                        const { file } =
                                                            data as any;
                                                        baixarZip(
                                                            currentTrimestre?.nome ||
                                                                "comprovantes",
                                                            file
                                                        );
                                                    })
                                                    .catch((Error: any) =>
                                                        setMensagem({
                                                            title: "Erro ao baixar",
                                                            message:
                                                                Error.message,
                                                            confirmText: "Ok",
                                                            cancelText:
                                                                "Cancelar",
                                                            onCancel: () =>
                                                                setMensagem(
                                                                    null
                                                                ),
                                                            onClose: () =>
                                                                setMensagem(
                                                                    null
                                                                ),
                                                            onConfirm: () =>
                                                                setMensagem(
                                                                    null
                                                                ),
                                                        })
                                                    )
                                                    .finally(() =>
                                                        setIsLoading(false)
                                                    );
                                            } else {
                                                setIsLoading(false);
                                                setMensagem({
                                                    title: "Sem imagens",
                                                    message:
                                                        "Não existem comprovantes anexados",
                                                    confirmText: "Ok",
                                                    cancelText: "Cancelar",
                                                    onCancel: () =>
                                                        setMensagem(null),
                                                    onClose: () =>
                                                        setMensagem(null),
                                                    onConfirm: () =>
                                                        setMensagem(null),
                                                });
                                            }
                                        }}
                                    >
                                        <span>
                                            <FontAwesomeIcon
                                                icon={faFileZipper}
                                            />
                                        </span>
                                        Comprovantes
                                    </motion.button>
                                </div>
                            </div>

                            {((isSuperAdmin.current &&
                                dadosTrimestre.bloqueado) ||
                                !isSuperAdmin.current) && (
                                <div className="relatorio-trimestral__buttons">
                                    {isSuperAdmin.current ? (
                                        <button
                                            onClick={() =>
                                                setMensagem({
                                                    message:
                                                        "Deseja liberar relatório para edição?",
                                                    title: "Desbloquear relatório",
                                                    icon: (
                                                        <FontAwesomeIcon
                                                            icon={faLockOpen}
                                                        />
                                                    ),
                                                    cancelText: "Cancelar",
                                                    confirmText:
                                                        "Sim, desbloquear",
                                                    onCancel: () =>
                                                        setMensagem(null),
                                                    onClose: () =>
                                                        setMensagem(null),
                                                    onConfirm: () => {
                                                        setIsLoading(true);
                                                        desbloquearRelatorio({
                                                            trimestreId:
                                                                currentTrimestre?.id,
                                                            igrejaId,
                                                        })
                                                            .then(() =>
                                                                navigate(
                                                                    "/relatorios"
                                                                )
                                                            )
                                                            .catch((err) => {
                                                                setIsLoading(
                                                                    false
                                                                );
                                                                setMensagem({
                                                                    cancelText:
                                                                        "Cancelar",
                                                                    confirmText:
                                                                        "Ok",
                                                                    message:
                                                                        err.message,
                                                                    onCancel:
                                                                        () =>
                                                                            window.location.reload(),
                                                                    onClose:
                                                                        () =>
                                                                            window.location.reload(),
                                                                    onConfirm:
                                                                        () =>
                                                                            window.location.reload(),
                                                                    title: "Houve um Erro",
                                                                    icon: (
                                                                        <FontAwesomeIcon
                                                                            icon={
                                                                                faTriangleExclamation
                                                                            }
                                                                        />
                                                                    ),
                                                                });
                                                            });
                                                    },
                                                })
                                            }
                                        >
                                            Desbloquear Relatório
                                        </button>
                                    ) : (
                                        <button
                                            disabled={
                                                dadosTrimestre.bloqueado ||
                                                (currentTrimestre?.data_fim &&
                                                    currentTrimestre?.data_fim.toDate() >
                                                        new Date())
                                            }
                                            onClick={() => setEnviar(true)}
                                        >
                                            Enviar Relatório
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="relatorio-trimestral__vazio">
                            <p>Nenhum dado encontrado</p>
                        </div>
                    )}
                </div>
            </div>

            <AlertModal isOpen={!!mensagem} {...mensagem!} />
            {downloadRelatorio && dadosTrimestre && (
                <RelatorioTrimestralDownload
                    dados={dadosTrimestre}
                    igreja={
                        igrejaId
                            ? igrejas.find((v) => v.id === igrejaId)!.nome
                            : user!.igrejaNome!
                    }
                    onSair={() => setDownloadRelatorio(false)}
                    trimestre={currentTrimestre!.nome.split(" (")[0]}
                />
            )}
            <AnimatePresence>
                {enviar && currentTrimestre && (
                    <ConfirmacaoModal
                        key={"confirmacao-modal"}
                        igrejaId={igrejaId || user!.igrejaId!}
                        trimestreId={currentTrimestre.id}
                        onCancel={() => setEnviar(false)}
                        onConfirm={() => navigate("/relatorios")}
                        setMenssageError={(err) =>
                            setMensagem({
                                cancelText: "Cancelar",
                                confirmText: "Ok",
                                message: err,
                                onCancel: () => setMensagem(null),
                                onClose: () => setMensagem(null),
                                onConfirm: () => setMensagem(null),
                                title: "Houve um Erro",
                                icon: (
                                    <FontAwesomeIcon
                                        icon={faTriangleExclamation}
                                    />
                                ),
                            })
                        }
                        valorFinal={Number(
                            (dadosTrimestre?.resumo_final.total || 0).toFixed(2)
                        )}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

export default RelatorioTrimestral;
