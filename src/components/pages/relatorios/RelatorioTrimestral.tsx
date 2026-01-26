import { AnimatePresence, motion, type Variants } from "framer-motion";
import "./relatorio-trimestral.scss";
import {
    faAngleRight,
    faCalendar,
    faCaretLeft,
    faCoins,
    faEarthAfrica,
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

interface ResumoFinal {
    total: number;
    total_ofertas_pix: number;
    total_ofertas_dinheiro: number;
    total_ofertas: number;
    total_missoes_pix: number;
    total_missoes_dinheiro: number;
    total_missoes: number;
}
interface DadosAcordeaoClasse {
    id: string;
    licaoId: string;
    igrejaId: string;
    nome: string;
    total: number;
    total_ofertas_pix: number;
    total_ofertas_dinheiro: number;
    total_ofertas: number;
    total_missoes_pix: number;
    total_missoes_dinheiro: number;
    total_missoes: number;
    comprovantes: string[];
}
interface DadosAcordeao {
    aula: number;
    data: string;
    total: number;
    realizada: boolean;
    total_ofertas_pix: number;
    total_ofertas_dinheiro: number;
    total_ofertas: number;
    total_missoes_pix: number;
    total_missoes_dinheiro: number;
    total_missoes: number;
    classes: DadosAcordeaoClasse[];
}

interface DadosTrimestrePorMes {
    id: string;
    nome: string;
    numero_mes: number;
    datas: DadosAcordeao[];
    bloqueado: boolean;
    relatorio: RelatoriosTrimestresInterface;
    resumo_final: ResumoFinal;
}

interface DadosTrimestre {
    bloqueado: boolean;
    meses: DadosTrimestrePorMes[];
    total_enviado: {
        valor_enviado_missoes: number;
        valor_enviado_ofertas: number;
    };
    resumo_final: ResumoFinal;
}

const variantsAcordeao: Variants = {
    initial: { height: 0, padding: "0" },
    animate: {
        height: "auto",
        padding: "1.5rem",
        transition: { ease: "linear", duration: 0.4 },
    },
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
    "getRelatorioTrimestral",
);
const desbloquearRelatorio = httpsCallable(functions, "desbloquearRelatorio");
const baixarTodosComprovantes = httpsCallable(
    functions,
    "baixarTodosComprovantes",
);

const Acordeao = ({
    children,
    title,
    value,
    className,
    isOpen,
    onOpen,
    tableMes,
}: {
    children: ReactNode;
    title: string | ReactNode;
    value: string | ReactNode;
    className?: string;
    isOpen: boolean;
    onOpen?: () => void;
    tableMes?: ReactNode;
}) => {
    return (
        <div className={`acordeao ${className ? className : ""}`}>
            <motion.div className="acordeao__header" onTap={onOpen}>
                <div className="acordeao__title">
                    <motion.span
                        animate={isOpen ? { rotate: 90 } : { rotate: 0 }}
                    >
                        <FontAwesomeIcon icon={faAngleRight} />
                    </motion.span>

                    {typeof title === "string" ? <h3>{title}</h3> : title}
                </div>

                <div className="acordeao__header-total">
                    {typeof value === "string" ? <h3>{value}</h3> : value}
                </div>
            </motion.div>
            <AnimatePresence>
                {tableMes && !isOpen && (
                    <motion.div
                        key={"grid"}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{
                            height: "auto",
                            opacity: 1,
                            transition: { delay: 0.3 },
                        }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        {tableMes}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>{isOpen && children}</AnimatePresence>
        </div>
    );
};
const AcordeaoLabelValores = ({
    totalMissoes,
    totalOfertas,
    isSimples,
}: {
    totalMissoes: number;
    totalOfertas: number;
    isSimples?: boolean;
}) => {
    return (
        <div className="acordeao__valores">
            <div
                className={`acordeao__valor ${isSimples ? "acordeao__valor--simples" : ""}`}
            >
                <span>
                    <FontAwesomeIcon icon={faEarthAfrica} />
                </span>
                <p>{totalMissoes.toLocaleString("pt-BR")}</p>
            </div>
            <div
                className={`acordeao__valor ${isSimples ? "acordeao__valor--simples" : ""}`}
            >
                <span>
                    <FontAwesomeIcon icon={faCoins} />
                </span>
                <p>{totalOfertas.toLocaleString("pt-BR")}</p>
            </div>
        </div>
    );
};
const AcordeaoTableMes = ({
    missaoPix,
    missaoDinheiro,
    totalMissao,
    ofertaPix,
    ofertaDinheiro,
    totalOferta,
}: {
    missaoPix: number;
    missaoDinheiro: number;
    totalMissao: number;
    ofertaPix: number;
    ofertaDinheiro: number;
    totalOferta: number;
}) => {
    const converter = (numero: number) =>
        numero.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
    return (
        <div className="acordeao__grid">
            <div className="acordeao__grid-item">
                <h3>
                    <span>
                        <FontAwesomeIcon icon={faEarthAfrica} />
                    </span>
                    Missões
                </h3>
                <div className="acordeao__grid-values">
                    <div className="acordeao__grid-value">
                        <span>
                            <FontAwesomeIcon icon={faMoneyBill} />
                        </span>
                        <p>{converter(missaoDinheiro)}</p>
                    </div>
                    <div className="acordeao__grid-value">
                        <span>
                            <FontAwesomeIcon icon={faPix} />
                        </span>
                        <p>{converter(missaoPix)}</p>
                    </div>
                    <div className="acordeao__grid-value acordeao__grid-total">
                        <span>
                            <FontAwesomeIcon icon={faEarthAfrica} />
                        </span>
                        <p>{converter(totalMissao)}</p>
                    </div>
                </div>
            </div>
            <div className="acordeao__grid-item">
                <h3>
                    <span>
                        <FontAwesomeIcon icon={faCoins} />
                    </span>
                    Ofertas
                </h3>

                <div className="acordeao__grid-values">
                    <div className="acordeao__grid-value">
                        <span>
                            <FontAwesomeIcon icon={faMoneyBill} />
                        </span>
                        <p>{converter(ofertaDinheiro)}</p>
                    </div>
                    <div className="acordeao__grid-value">
                        <span>
                            <FontAwesomeIcon icon={faPix} />
                        </span>
                        <p>{converter(ofertaPix)}</p>
                    </div>
                    <div className="acordeao__grid-value acordeao__grid-total">
                        <span>
                            <FontAwesomeIcon icon={faCoins} />
                        </span>
                        <p>{converter(totalOferta)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
const AcordeaoTotal = ({
    isClasse,
    isMissao,
    data,
}: {
    isClasse: boolean;
    isMissao: boolean;
    data: DadosAcordeaoClasse | DadosAcordeao;
}) => {
    const cssClass = isClasse ? "relatorio-classes" : "relatorio-geral";
    const title = isMissao ? (
        <>
            <span>
                <FontAwesomeIcon icon={faEarthAfrica} />
            </span>
            <span>Missões</span>
        </>
    ) : (
        <>
            <span>
                <FontAwesomeIcon icon={faCoins} />
            </span>
            <span>Ofertas</span>
        </>
    );
    const key = isMissao ? "missoes" : "ofertas";
    const typeCurrency = {
        currency: "BRL",
        style: "currency",
    } as any;

    const Total = ({
        total,
        isPix,
        isTotal = false,
    }: {
        total: string;
        isPix: boolean;
        isTotal?: boolean;
    }) => (
        <div className={`${cssClass}__valor`}>
            {isTotal ? (
                <h5>{total}</h5>
            ) : (
                <>
                    <span>
                        <FontAwesomeIcon icon={isPix ? faPix : faMoneyBill} />
                    </span>

                    <p>{total}</p>
                </>
            )}
        </div>
    );

    return (
        <div className={`${cssClass}__total`}>
            <h4>{title}</h4>
            <Total
                isPix={false}
                total={data[`total_${key}_dinheiro`].toLocaleString(
                    "pt-BR",
                    typeCurrency,
                )}
            />
            <Total
                isPix
                total={data[`total_${key}_pix`].toLocaleString(
                    "pt-BR",
                    typeCurrency,
                )}
            />
            <Total
                isPix
                isTotal
                total={data[`total_${key}`].toLocaleString(
                    "pt-BR",
                    typeCurrency,
                )}
            />
        </div>
    );
};
const AcordeaoTotais = ({
    data,
    isClasse,
    onEdit,
}: {
    data: any;
    isClasse: boolean;
    onEdit?: () => void;
}) => (
    <div className={`relatorio-${isClasse ? "classes" : "geral"}__totais`}>
        <AcordeaoTotal isMissao isClasse={isClasse} data={data} />
        <AcordeaoTotal isMissao={false} isClasse={isClasse} data={data} />

        {isClasse && (
            <div className="relatorio-classes__editar">
                <button onClick={onEdit}>Editar Aula</button>
            </div>
        )}
    </div>
);
const AcordeaoEnviado = ({
    relatorio,
}: {
    relatorio: RelatoriosTrimestresInterface;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const data = relatorio.data_envio as any;
    return (
        <div className="relatorio-trimestral__enviado">
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
                            variants={variantsAcordeao}
                            initial="initial"
                            animate={{ height: "auto" }}
                            exit="exit"
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                            <div className="relatorio-enviado__infos">
                                <div className="relatorio-enviado__info">
                                    <p>
                                        Assinado por:{" "}
                                        <strong>
                                            {relatorio.assinado_por.nome}
                                        </strong>
                                    </p>
                                </div>
                                <div className="relatorio-enviado__info">
                                    <p>
                                        Email:{" "}
                                        <strong>
                                            {relatorio.assinado_por.email}
                                        </strong>
                                    </p>
                                </div>
                                {relatorio.descricao_missao && (
                                    <div className="relatorio-enviado__info">
                                        <p>
                                            Justificativa Missões:{" "}
                                            <strong>
                                                {relatorio.descricao_missao}
                                            </strong>
                                        </p>
                                    </div>
                                )}
                                {relatorio.descricao_oferta && (
                                    <div className="relatorio-enviado__info">
                                        <p>
                                            Justificativa Ofertas:{" "}
                                            <strong>
                                                {relatorio.descricao_oferta}
                                            </strong>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
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
        <Acordeao
            className="relatorio-classe"
            title={classe.nome}
            value={<div className="relatorio-classe__header-total"></div>}
            isOpen={open}
        >
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
                <AcordeaoTotais data={classe} isClasse onEdit={onEdit} />

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
        </Acordeao>
    );
};
const AcordeaoDia = ({ data }: { data: DadosAcordeao }) => {
    const [isOpenClasse, setIsOpenClasse] = useState(-1);
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const irParaAula = (
        igrejaId: string,
        id: string,
        licaoId: string,
        aula: number,
    ) => navigate(`/aulas/${igrejaId}/${id}/${licaoId}/${aula}`);

    return (
        <Acordeao
            title={`${data.aula} (${data.data})`}
            value={
                data.realizada ? (
                    <AcordeaoLabelValores
                        totalMissoes={data.total_missoes}
                        totalOfertas={data.total_ofertas}
                    />
                ) : (
                    <p className="relatorio-geral__nao-realizada">
                        Sem registro
                    </p>
                )
            }
            onOpen={() => setIsOpen((v) => !v)}
            isOpen={isOpen}
        >
            {data.realizada && (
                <motion.div
                    key={"acordeao"}
                    className="relatorio-geral__body"
                    variants={variantsAcordeao}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.5 }}
                >
                    <AcordeaoTotais data={data} isClasse={false} />

                    <div className="relatorio-geral__classes">
                        {data.classes
                            .sort((a, b) => a.nome.localeCompare(b.nome))
                            .map((v, i) => (
                                <motion.div
                                    key={v.id}
                                    onClick={() =>
                                        setIsOpenClasse((c) =>
                                            c === i ? -1 : i,
                                        )
                                    }
                                >
                                    <AcordeaoClasse
                                        classe={v}
                                        open={isOpenClasse === i}
                                        onEdit={() =>
                                            irParaAula(
                                                v.igrejaId,
                                                v.id,
                                                v.licaoId,
                                                data.aula,
                                            )
                                        }
                                    />
                                </motion.div>
                            ))}
                    </div>
                </motion.div>
            )}
        </Acordeao>
    );
};

const RelatorioValor = ({
    isPix,
    value,
    isTotal = false,
}: {
    isPix: boolean;
    value: string;
    isTotal?: boolean;
}) => {
    return (
        <div className="relatorio-trimestral__resumo-valor">
            {isTotal ? (
                <h3>{value}</h3>
            ) : (
                <>
                    <span>
                        <FontAwesomeIcon icon={isPix ? faPix : faMoneyBill} />
                    </span>
                    <p>{value}</p>
                </>
            )}
        </div>
    );
};

const RelatorioTotal = ({
    isMissao,
    resumoFinal,
}: {
    isMissao: boolean;
    resumoFinal: ResumoFinal;
}) => {
    const key = isMissao ? "missoes" : "ofertas";
    const typeCurrency = {
        currency: "BRL",
        style: "currency",
    } as any;
    return (
        <div className="relatorio-trimestral__resumo-total">
            <h4>
                {isMissao ? (
                    <>
                        <span>
                            <FontAwesomeIcon icon={faEarthAfrica} />
                        </span>{" "}
                        <span>Missões</span>
                    </>
                ) : (
                    <>
                        <span>
                            <FontAwesomeIcon icon={faCoins} />
                        </span>{" "}
                        <span>Ofertas</span>
                    </>
                )}
            </h4>
            <RelatorioValor
                isPix={false}
                value={resumoFinal[`total_${key}_dinheiro`].toLocaleString(
                    "pt-BR",
                    typeCurrency,
                )}
            />
            <RelatorioValor
                isPix
                value={resumoFinal[`total_${key}_pix`].toLocaleString(
                    "pt-BR",
                    typeCurrency,
                )}
            />
            <RelatorioValor
                isPix
                isTotal
                value={(resumoFinal[`total_${key}`] || 0).toLocaleString(
                    "pt-BR",
                    typeCurrency,
                )}
            />
        </div>
    );
};
const RelatorioTotalEnviado = ({
    isMissao,
    relatorio,
    isGeral,
}: {
    isMissao: boolean;
    relatorio:
        | RelatoriosTrimestresInterface
        | {
              valor_enviado_missoes: number;
              valor_enviado_ofertas: number;
          };
    isGeral?: boolean;
}) => {
    const key = isMissao ? "missoes" : "ofertas";
    const typeCurrency = {
        currency: "BRL",
        style: "currency",
    } as any;
    return (
        <div className="relatorio-trimestral__resumo-total-enviado">
            <p>
                {isMissao ? (
                    <span>
                        <FontAwesomeIcon icon={faEarthAfrica} />
                    </span>
                ) : (
                    <span>
                        <FontAwesomeIcon icon={faCoins} />
                    </span>
                )}
                <span>Total Enviado</span>
            </p>
            <h3>
                {isGeral
                    ? (relatorio?.[`valor_enviado_${key}`] || 0).toLocaleString(
                          "pt-BR",
                          typeCurrency,
                      )
                    : (relatorio?.[`valor_enviado_${key}`] || 0).toLocaleString(
                          "pt-BR",
                          typeCurrency,
                      )}
            </h3>
        </div>
    );
};
const AcordeaoMes = ({
    mes,
    onEnviarRelatorio,
    onDesbloquearRelatorio,
    isSuperAdmin,
}: {
    mes: DadosTrimestrePorMes;
    onEnviarRelatorio: (mes: DadosTrimestrePorMes) => void;
    onDesbloquearRelatorio: (mes: DadosTrimestrePorMes) => void;
    isSuperAdmin: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dataSplit = mes.datas[mes.datas.length - 1].data.split("/") as any;

    const naoPodeEnviar =
        mes.bloqueado ||
        new Date() <= new Date(dataSplit[2], dataSplit[1] - 1, dataSplit[0]);
    return (
        <Acordeao
            title={mes.nome}
            isOpen={isOpen}
            onOpen={() => setIsOpen((v) => !v)}
            value={
                !isOpen && !mes.bloqueado ? (
                    <p className="acordeao__pendente">Envio Pendente</p>
                ) : !isOpen ? (
                    <p className="acordeao__enviado">Enviado</p>
                ) : mes.bloqueado ? (
                    <AcordeaoLabelValores
                        totalMissoes={mes.relatorio.valor_enviado_missoes}
                        totalOfertas={mes.relatorio.valor_enviado_ofertas}
                    />
                ) : (
                    <AcordeaoLabelValores
                        totalMissoes={mes.resumo_final.total_missoes}
                        totalOfertas={mes.resumo_final.total_ofertas}
                        isSimples
                    />
                )
            }
            className={mes.bloqueado ? "acordeao--enviado" : ""}
            tableMes={
                <AcordeaoTableMes
                    missaoDinheiro={mes.resumo_final.total_missoes_dinheiro}
                    missaoPix={mes.resumo_final.total_missoes_pix}
                    ofertaDinheiro={mes.resumo_final.total_ofertas_dinheiro}
                    ofertaPix={mes.resumo_final.total_ofertas_pix}
                    totalMissao={
                        mes.bloqueado
                            ? mes.relatorio.valor_enviado_missoes
                            : mes.resumo_final.total_missoes
                    }
                    totalOferta={
                        mes.bloqueado
                            ? mes.relatorio.valor_enviado_ofertas
                            : mes.resumo_final.total_ofertas
                    }
                />
            }
        >
            <motion.div
                className="relatorio-trimestral__mes"
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ ease: "linear" }}
            >
                <div className="relatorio-trimestral__acordeoes">
                    {mes.bloqueado && (
                        <AcordeaoEnviado relatorio={mes.relatorio} />
                    )}
                    {mes.datas
                        .sort((a, b) => a.aula - b.aula)
                        .map((v, i) => (
                            <AcordeaoDia data={v} key={i} />
                        ))}
                </div>
                <div className="relatorio-trimestral__resumo">
                    <div className="relatorio-trimestral__resumo-totais">
                        <RelatorioTotal
                            isMissao
                            resumoFinal={mes.resumo_final}
                        />
                        <RelatorioTotal
                            isMissao={false}
                            resumoFinal={mes.resumo_final}
                        />
                    </div>

                    <div className="relatorio-trimestral__resumo-total_geral">
                        {mes.bloqueado && (
                            <>
                                <RelatorioTotalEnviado
                                    isMissao
                                    relatorio={mes.relatorio}
                                />
                                <RelatorioTotalEnviado
                                    isMissao={false}
                                    relatorio={mes.relatorio}
                                />
                            </>
                        )}
                    </div>
                    <div className="relatorio-trimestral__buttons">
                        {isSuperAdmin ? (
                            <motion.button
                                onTap={() => onDesbloquearRelatorio(mes)}
                                disabled={!mes.bloqueado}
                            >
                                Desbloquear Relatório {mes.nome}
                            </motion.button>
                        ) : (
                            <motion.button
                                onTap={() => onEnviarRelatorio(mes)}
                                disabled={naoPodeEnviar}
                            >
                                Enviar Relatório {mes.nome}
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.div>
        </Acordeao>
    );
};

const IgrejasGrid = ({
    igrejas,
    meses,
}: {
    igrejas: ({ [key: string]: RelatoriosTrimestresInterface } & {
        igrejaNome: string;
        igrejaId: string;
    })[];
    meses: string[];
}) => {
    const [ordem, setOrdem] = useState(meses[0]);
    const navigate = useNavigate();
    const IgrejaCard = ({ igreja }: any) => {
        return (
            <div
                key={igreja.igrejaId}
                className="relatorio-trimestral__igreja"
                onClick={() => navigate(igreja.igrejaId)}
            >
                <h3>{igreja.igrejaNome}</h3>

                <div className="relatorio-trimestral__igreja-dados">
                    {meses.map((v, i) => (
                        <div
                            className="relatorio-trimestral__igreja-total"
                            key={i}
                        >
                            <h4>{v}</h4>
                            <div className="relatorio-trimestral__igreja-valores">
                                {igreja[v] ? (
                                    <>
                                        <div className="relatorio-trimestral__igreja-valor">
                                            <span>
                                                <FontAwesomeIcon
                                                    icon={faEarthAfrica}
                                                />
                                            </span>
                                            <p>
                                                {igreja[v][
                                                    "valor_enviado_missoes"
                                                ].toLocaleString("pt-BR")}
                                            </p>
                                        </div>

                                        <div className="relatorio-trimestral__igreja-valor">
                                            <span>
                                                <FontAwesomeIcon
                                                    icon={faCoins}
                                                />
                                            </span>
                                            <p>
                                                {igreja[v][
                                                    "valor_enviado_ofertas"
                                                ].toLocaleString("pt-BR")}
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="relatorio-trimestral__igreja-dados">
                                        <p className="relatorio-trimestral__igreja-pendente">
                                            Pendente
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="relatorio-trimestral__igrejas">
            <div className="relatorio-trimestral__ordenacao">
                {meses.map((v) => (
                    <div key={v}>
                        <label htmlFor={v}>{v}</label>
                        <input
                            type="radio"
                            name="mes"
                            id={v}
                            checked={v === ordem}
                            onChange={() => setOrdem(v)}
                        />
                    </div>
                ))}
            </div>

            <div className="relatorio-trimestral__igrejas-enviados">
                {igrejas
                    .sort((a, b) => {
                        const v1 = a[ordem] ? 1 : 0;
                        const v2 = b[ordem] ? 1 : 0;

                        return v2 - v1;
                    })
                    .map((v) => (
                        <IgrejaCard key={v.igrejaId} igreja={v} />
                    ))}
            </div>
        </div>
    );
};

const Relatorio = ({
    dadosTrimestre,
    onDownloadRecibo,
    onDownloadComprovantes,
    onDownloadCSV,
    disableRecibo,
    onEnviarRelatorio,
    onDesbloquearRelatorio,
}: {
    dadosTrimestre: DadosTrimestre;
    onDownloadRecibo: () => void;
    onDownloadComprovantes: () => void;
    onEnviarRelatorio: (mes: DadosTrimestrePorMes) => void;
    onDesbloquearRelatorio: (mes: DadosTrimestrePorMes) => void;
    onDownloadCSV: () => void;
    disableRecibo: boolean;
}) => {
    const { isSuperAdmin } = useAuthContext();
    return (
        <>
            {dadosTrimestre.meses
                .sort((a, b) => a.numero_mes - b.numero_mes)
                .map((v) => (
                    <AcordeaoMes
                        mes={v}
                        key={v.id}
                        onEnviarRelatorio={onEnviarRelatorio}
                        onDesbloquearRelatorio={onDesbloquearRelatorio}
                        isSuperAdmin={isSuperAdmin.current}
                    />
                ))}

            {dadosTrimestre.meses.length ? (
                <div className="relatorio-trimestral__resumo">
                    <div className="relatorio-trimestral__resumo-totais">
                        <RelatorioTotal
                            isMissao
                            resumoFinal={dadosTrimestre.resumo_final}
                        />
                        <RelatorioTotal
                            isMissao={false}
                            resumoFinal={dadosTrimestre.resumo_final}
                        />
                    </div>

                    <div className="relatorio-trimestral__resumo-total_geral">
                        {
                            <>
                                <RelatorioTotalEnviado
                                    isMissao
                                    isGeral
                                    relatorio={dadosTrimestre.total_enviado}
                                />
                                <RelatorioTotalEnviado
                                    isMissao={false}
                                    isGeral
                                    relatorio={dadosTrimestre.total_enviado}
                                />
                            </>
                        }
                    </div>

                    <div className="relatorio-trimestral__resumo-buttons">
                        <motion.button
                            title="Baixar Recibo"
                            onTap={onDownloadRecibo}
                            disabled={disableRecibo}
                        >
                            <span>
                                <FontAwesomeIcon icon={faFilePdf} />
                            </span>
                            Recibo
                        </motion.button>
                        <motion.button
                            title="Baixar Comprovantes Pix"
                            onTap={onDownloadComprovantes}
                        >
                            <span>
                                <FontAwesomeIcon icon={faFileZipper} />
                            </span>
                            Comprovantes
                        </motion.button>
                        <motion.button
                            title="Baixar Comprovantes Pix"
                            onTap={onDownloadCSV}
                        >
                            <span>
                                <FontAwesomeIcon icon={faFileZipper} />
                            </span>
                            CSV
                        </motion.button>
                    </div>
                </div>
            ) : (
                <Vazio />
            )}
        </>
    );
};

const Vazio = () => (
    <div className="relatorio-trimestral__vazio">
        <p>Nenhum dado encontrado</p>
    </div>
);

function RelatorioTrimestral() {
    const [todasIgrejas, setTodasIgrejas] = useState<
        ({ [key: string]: RelatoriosTrimestresInterface } & {
            igrejaNome: string;
            igrejaId: string;
        })[]
    >([]);
    const [meses, setMeses] = useState<string[]>([]);
    const [trimestres, setTrimestres] = useState<TrimestresInterface[]>([]);
    const [currentTrimestre, setCurrentTrimestre] =
        useState<TrimestresInterface | null>(null);
    const [loadingTrimestres, setLoadingTrimestres] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [enviarRelatorio, setEnviarRelatorio] =
        useState<DadosTrimestrePorMes | null>(null);
    const [downloadRelatorio, setDownloadRelatorio] = useState(false);
    const [dadosTrimestre, setDadosTrimestre] = useState<DadosTrimestre | null>(
        null,
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

    const baixarRecibo = () => {
        setDownloadRelatorio(true);
    };
    const extrairImagens = (lista: any[], resultado: any[] = []) => {
        for (const item of lista) {
            if (Array.isArray(item)) extrairImagens(item, resultado);
            else resultado.push(item);
        }

        return resultado;
    };

    const baixarCSV = (dados: DadosTrimestre) => {
        const igrejaNome = igrejas.find(
            (v) => v.id === igrejaId || user?.igrejaId,
        )?.nome;
        const colunas = Object.keys(dados.meses[0].resumo_final);
        const linhas = dados.meses.map((v) =>
            [
                v.nome,
                igrejaNome,
                ...colunas.map((c) =>
                    v.resumo_final[c as keyof ResumoFinal].toLocaleString(
                        "pt-BR",
                    ),
                ),
                (v.relatorio?.["valor_enviado_ofertas"] || 0).toLocaleString(
                    "pt-BR",
                ),
                (v.relatorio?.["valor_enviado_missoes"] || 0).toLocaleString(
                    "pt-BR",
                ),
                v?.["relatorio"]?.assinado_por?.nome || "null",
                v?.relatorio?.["data_envio"] || "null",
            ].join(";"),
        );
        linhas.push(
            [
                "Total",
                igrejaNome,
                ...colunas.map((c) =>
                    dados.resumo_final[c as keyof ResumoFinal].toLocaleString(
                        "pt-BR",
                    ),
                ),
                (
                    dados.total_enviado?.["valor_enviado_missoes"] || 0
                ).toLocaleString("pt-BR"),
                (
                    dados.total_enviado?.["valor_enviado_ofertas"] || 0
                ).toLocaleString("pt-BR"),
                "null",
                "null",
            ].join(";"),
        );
        colunas.unshift("mes", "igreja");
        colunas.push(
            "total_missoes_enviado",
            "total_ofertas_enviado",
            "assinado_por",
            "data_envio",
        );

        const tabela = [colunas.join(";"), ...linhas].join("\n");

        const blob = new Blob([tabela], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `CSV ${currentTrimestre?.nome || ""}`;

        document.body.append(a);

        a.click();

        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    const baixarComprovantes = (imagens: any[]) => {
        setIsLoading(true);

        if (imagens.length) {
            baixarTodosComprovantes({
                igrejaId: igrejaId || user?.igrejaId,
                dados: imagens,
            })
                .then(({ data }) => {
                    const { file } = data as any;

                    baixarZip(currentTrimestre?.nome || "comprovantes", file);
                })
                .catch((Error: any) =>
                    setMensagem({
                        title: "Erro ao baixar",
                        message: Error.message,
                        confirmText: "Ok",
                        cancelText: "Cancelar",
                        onCancel: () => setMensagem(null),
                        onClose: () => setMensagem(null),
                        onConfirm: () => setMensagem(null),
                    }),
                )
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
            setMensagem({
                title: "Sem imagens",
                message: "Não existem comprovantes anexados",
                confirmText: "Ok",
                cancelText: "Cancelar",
                onCancel: () => setMensagem(null),
                onClose: () => setMensagem(null),
                onConfirm: () => setMensagem(null),
            });
        }
    };
    const liberarRelatorio = (mes: DadosTrimestrePorMes) => {
        setMensagem({
            message: `Deseja liberar o relatório de ${mes.nome} para edição?`,
            title: "Desbloquear relatório",
            icon: <FontAwesomeIcon icon={faLockOpen} />,
            cancelText: "Cancelar",
            confirmText: "Sim, desbloquear",
            onCancel: () => setMensagem(null),
            onClose: () => setMensagem(null),
            onConfirm: () => {
                setIsLoading(true);
                desbloquearRelatorio({
                    trimestreId: currentTrimestre?.id,
                    igrejaId,
                    numeroMes: mes.numero_mes,
                })
                    .then(() => navigate("/relatorios"))
                    .catch((err) => {
                        setIsLoading(false);
                        setMensagem({
                            cancelText: "Cancelar",
                            confirmText: "Ok",
                            message: err.message,
                            onCancel: () => window.location.reload(),
                            onClose: () => window.location.reload(),
                            onConfirm: () => window.location.reload(),
                            title: "Houve um Erro",
                            icon: (
                                <FontAwesomeIcon icon={faTriangleExclamation} />
                            ),
                        });
                    });
            },
        });
    };

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
                where("trimestreId", "==", currentTrimestre!.id),
                where("bloqueado", "==", true),
            );
            const igrejasDocs = await getDocs(q);
            const igrejasMap = new Map();

            const dataInicio = currentTrimestre!.data_inicio.toDate();
            dataInicio.setDate(1);
            const dataFim = currentTrimestre!.data_fim.toDate();
            const meses = new Set();

            while (dataInicio <= dataFim) {
                const mes = dataInicio.toLocaleDateString("pt-BR", {
                    month: "long",
                });
                meses.add(mes);
                dataInicio.setMonth(dataInicio.getMonth() + 1);
            }

            igrejasDocs.forEach((v) => {
                const igrejaData = v.data() as RelatoriosTrimestresInterface;

                const igreja = igrejasMap.get(igrejaData.igrejaId) || {};
                const mes = new Date(
                    igrejaData.data_inicio.toDate().getFullYear(),
                    igrejaData.numeroMes,
                    10,
                ).toLocaleDateString("pt-BR", { month: "long" });

                igreja[mes] = { ...igrejaData };

                igrejasMap.set(igrejaData.igrejaId, igreja);
            });

            igrejas.forEach((v) => {
                const igrejaNome = v.nome;
                const igrejaId = v.id;
                const igreja = igrejasMap.get(v.id) || {};
                igreja["igrejaNome"] = igrejaNome;
                igreja["igrejaId"] = igrejaId;

                igrejasMap.set(igrejaId, igreja);
            });

            setTodasIgrejas(Array.from(igrejasMap.values()));
            setMeses(Array.from(meses.values()) as any);
            setIsLoading(false);
        };

        if (currentTrimestre) {
            if (isSuperAdmin.current && !igrejaId) {
                getIgrejas();
            } else
                getRelatorio(
                    isSuperAdmin.current ? igrejaId! : user!.igrejaId!,
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
                limit(100),
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
                    a.data_inicio.toDate().getTime(),
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
                    }),
                )
                .finally(() => setLoadingTrimestres(false));
        }
    }, [user]);
    if (isLoadingData || isLoading) return <Loading />;
    if (isSecretario.current) return <Navigate to={"/relatorios"} />;
    if (!isSuperAdmin.current && igrejaId)
        <Navigate to={"/relatorios/trimestral/"} />;
    return (
        <>
            <div className="relatorio-trimestral">
                <div className="relatorio-trimestral__header">
                    <div className="relatorio-trimestral__title">
                        <button
                            className="relatorio-trimestral__title-infos"
                            title="Voltar"
                            onClick={() => window.history.back()}
                        >
                            <span title="Voltar">
                                <FontAwesomeIcon icon={faCaretLeft} />
                            </span>
                            <h2>
                                Relatório{" "}
                                {igrejaId
                                    ? igrejas.find((v) => igrejaId == v.id)
                                          ?.nome
                                    : "Trimestral"}
                            </h2>
                        </button>
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
                    {!currentTrimestre ? (
                        <Vazio />
                    ) : //Lógica Super ADMIN
                    isSuperAdmin.current && !igrejaId ? (
                        <IgrejasGrid igrejas={todasIgrejas} meses={meses} />
                    ) : dadosTrimestre !== null ? (
                        <Relatorio
                            dadosTrimestre={dadosTrimestre}
                            onDownloadComprovantes={() => {
                                const imgs = dadosTrimestre.meses.flatMap((v) =>
                                    v.datas.flatMap((v) =>
                                        v.classes.map((v) => v.comprovantes),
                                    ),
                                );

                                baixarComprovantes(extrairImagens(imgs));
                            }}
                            onDownloadRecibo={baixarRecibo}
                            disableRecibo={downloadRelatorio}
                            onEnviarRelatorio={(mes) => setEnviarRelatorio(mes)}
                            onDesbloquearRelatorio={liberarRelatorio}
                            onDownloadCSV={() => baixarCSV(dadosTrimestre)}
                        />
                    ) : (
                        <Vazio />
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
                {enviarRelatorio && currentTrimestre && (
                    <ConfirmacaoModal
                        key={"confirmacao-modal"}
                        igrejaId={igrejaId || user!.igrejaId!}
                        trimestreId={currentTrimestre.id}
                        onCancel={() => setEnviarRelatorio(null)}
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
                        valorFinalMissao={
                            enviarRelatorio?.resumo_final.total_missoes || 0
                        }
                        valorFinalOferta={
                            enviarRelatorio?.resumo_final.total_ofertas || 0
                        }
                        nomeMes={enviarRelatorio.nome}
                        numeroMes={enviarRelatorio.numero_mes}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

export default RelatorioTrimestral;
