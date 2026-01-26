import { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSackDollar,
    faMoneyBill,
    faCalculator,
    faCalendar,
    faEarthAfrica,
    faCoins,
} from "@fortawesome/free-solid-svg-icons";
import "./relatorio-leitura.scss";
import { faPix } from "@fortawesome/free-brands-svg-icons";
import html2pdf from "html2pdf.js";
import type { RelatoriosTrimestresInterface } from "../../../interfaces/RelatoriosTrimestresInterface";

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
interface ResumoFinal {
    total: number;
    total_ofertas_pix: number;
    total_ofertas_dinheiro: number;
    total_ofertas: number;
    total_missoes_pix: number;
    total_missoes_dinheiro: number;
    total_missoes: number;
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

interface RelatorioLeituraProps {
    dados: DadosTrimestre;
    igreja: string;
    onSair: () => void;
    trimestre: string;
}

const InfoLinha = ({
    icon,
    label,
    value,
    isMenor = false,
    totalMissoes,
    totalOfertas,
}: {
    icon: any;
    label: string;
    value?: string | number;
    totalMissoes?: string;
    totalOfertas?: string;
    isMenor?: boolean;
}) => (
    <div
        style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            fontSize: isMenor ? "14px" : "18px",
            padding: isMenor ? "10px 0" : "15px 0",
            gap: "2px",
        }}
    >
        <div
            style={{
                color: "#6b7280",
                fontWeight: "500",
            }}
        >
            <FontAwesomeIcon
                icon={icon}
                fontSize={isMenor ? "16px" : "20px"}
                style={{
                    padding: 0,
                    verticalAlign: -8,
                    boxSizing: "border-box",
                    display: "inline-block",
                    marginRight: "10px",
                }}
                color="#3b82f6"
            />
            <span>{label}</span>
        </div>
        <div
            style={{
                width: "100%",
                borderBottom: "2px dotted black",
                height: "1px",
                paddingBottom: "5px",
                alignSelf: "flex-end",
            }}
        ></div>
        {totalMissoes ? (
            <div
                style={{
                    display: "grid",
                    gap: "5px",
                    gridTemplateColumns: "repeat(2, minmax(70px, 1fr))",
                    color: "#111827",
                    borderRadius: "50%",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        gap: "3px",
                    }}
                >
                    <span style={{ color: "#0ea5e9" }}>
                        <FontAwesomeIcon
                            style={{
                                padding: 0,
                                verticalAlign: -8,
                                boxSizing: "border-box",
                                display: "inline-block",
                                marginRight: "0px",
                            }}
                            icon={faEarthAfrica}
                        />
                    </span>
                    <p>{totalMissoes}</p>
                </div>
                <div
                    style={{
                        display: "flex",
                        gap: "3px",
                    }}
                >
                    <span style={{ color: "#10b981" }}>
                        <FontAwesomeIcon
                            style={{
                                padding: 0,
                                verticalAlign: -8,
                                boxSizing: "border-box",
                                display: "inline-block",
                                marginRight: "0px",
                            }}
                            icon={faCoins}
                        />
                    </span>
                    <p>{totalOfertas}</p>
                </div>
            </div>
        ) : (
            <div
                style={{
                    fontWeight: "700",
                    color: "#111827",
                    minWidth: "90px",
                }}
            >
                {value}
            </div>
        )}
    </div>
);

function RelatorioTrimestralDownload({
    dados,
    onSair,
    igreja,
    trimestre,
}: RelatorioLeituraProps) {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        new html2pdf()
            .from(container.current!)
            .set({
                margin: 0,
                filename: "relatorio.pdf",
                html2canvas: { scale: 2 },
                jsPDF: { format: "A4" },
            })
            .toPdf()
            .save("relatorio")
            .finally(onSair);
    }, []);

    return (
        <div
            style={{
                visibility: "hidden",
                overflowX: "hidden",
                maxWidth: "100%",
            }}
        >
            <div
                className="relatorio-leitura__body"
                style={{ height: "0", overflow: "hidden" }}
            >
                <div
                    ref={container}
                    style={{
                        width: "100%",
                        maxWidth: "750px",
                    }}
                >
                    {dados.meses.map((v, i) => (
                        <div
                            key={i}
                            style={{
                                minHeight: "297mm",
                                maxHeight: "297mm",
                                minWidth: "210mm",
                                maxWidth: "210mm",
                                backgroundColor: "#ffffff",
                                padding: "25px 30px",
                                position: "relative",
                            }}
                        >
                            <h3
                                style={{
                                    fontSize: "24px",
                                    fontWeight: "700",
                                    textAlign: "center",
                                    color: "#111827",
                                    marginBottom: "25px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "10px",
                                }}
                            >
                                {v.nome}
                            </h3>

                            {v.datas
                                .sort((a, b) => a.aula - b.aula)
                                .map((d) => (
                                    <InfoLinha
                                        key={d.aula}
                                        icon={faCalendar}
                                        label={`${d.aula} - (${d.data})`}
                                        totalMissoes={d.total_missoes.toLocaleString(
                                            "pt-BR",
                                        )}
                                        totalOfertas={d.total_ofertas.toLocaleString(
                                            "pt-BR",
                                        )}
                                    />
                                ))}

                            <hr
                                style={{
                                    border: "none",
                                    borderTop: "1px solid #f3f4f6",
                                    margin: "25px 0",
                                }}
                            />

                            <h3
                                style={{
                                    fontSize: "24px",
                                    fontWeight: "700",
                                    textAlign: "center",
                                    color: "#111827",
                                    marginBottom: "25px",
                                    display: "flex",
                                    gap: "5px",
                                }}
                            >
                                <span style={{ color: "#0ea5e9" }}>
                                    <FontAwesomeIcon
                                        style={{
                                            padding: 0,
                                            verticalAlign: -16,
                                            boxSizing: "border-box",
                                            display: "inline-block",
                                            marginRight: "0px",
                                        }}
                                        icon={faEarthAfrica}
                                    />
                                </span>
                                <span>Missões</span>
                            </h3>

                            <InfoLinha
                                icon={faMoneyBill}
                                label="Missões Dinheiro"
                                value={(
                                    v.resumo_final.total_missoes_dinheiro || 0
                                ).toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                })}
                            />
                            <InfoLinha
                                icon={faPix}
                                label="Missões Pix"
                                value={(
                                    v.resumo_final.total_missoes_pix || 0
                                ).toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                })}
                            />
                            <InfoLinha
                                icon={faCalculator}
                                label="Total Missões"
                                value={(
                                    v.resumo_final.total_missoes || 0
                                ).toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                })}
                            />

                            <hr
                                style={{
                                    border: "none",
                                    borderTop: "1px solid #f3f4f6",
                                    margin: "15px 10px",
                                }}
                            />

                            <h3
                                style={{
                                    fontSize: "24px",
                                    fontWeight: "700",
                                    textAlign: "center",
                                    color: "#111827",
                                    marginBottom: "25px",
                                    display: "flex",
                                    gap: "5px",
                                }}
                            >
                                <span style={{ color: "#10b981" }}>
                                    <FontAwesomeIcon
                                        style={{
                                            padding: 0,
                                            verticalAlign: -16,
                                            boxSizing: "border-box",
                                            display: "inline-block",
                                            marginRight: "0px",
                                        }}
                                        icon={faCoins}
                                    />
                                </span>
                                <span>Ofertas</span>
                            </h3>
                            <InfoLinha
                                icon={faMoneyBill}
                                label="Ofertas Dinheiro"
                                value={(
                                    v.resumo_final.total_ofertas_dinheiro || 0
                                ).toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                })}
                            />
                            <InfoLinha
                                icon={faPix}
                                label="Ofertas Pix"
                                value={(
                                    v.resumo_final.total_ofertas_pix || 0
                                ).toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                })}
                            />
                            <InfoLinha
                                icon={faCalculator}
                                label="Total Ofertas"
                                value={(
                                    v.resumo_final.total_ofertas || 0
                                ).toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                })}
                            />

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "5px 10px",
                                    position: "absolute",
                                    transform: "translateX(-50%)",
                                    bottom: 0,
                                    left: "50%",
                                    width: "100%",
                                    borderTop: "1px solid #e5e7eb",
                                    backgroundColor: "#ffffff",
                                    marginBottom: "20px",
                                    marginTop: "20px",
                                }}
                            >
                                <h2
                                    style={{
                                        display: "flex",
                                        fontSize: "20px",
                                        fontWeight: "700",
                                        color: "#111827",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: "10px",
                                        width: "100%",
                                    }}
                                >
                                    {igreja}

                                    <span>{trimestre}</span>
                                </h2>
                            </div>
                        </div>
                    ))}

                    <div
                        key={"totais-relatorio-leitura"}
                        style={{
                            minHeight: "297mm",
                            maxHeight: "297mm",
                            minWidth: "210mm",
                            maxWidth: "210mm",
                            backgroundColor: "#ffffff",
                            padding: "30px",
                            position: "relative",
                        }}
                    >
                        <h3
                            style={{
                                fontSize: "24px",
                                fontWeight: "700",
                                textAlign: "center",
                                color: "#111827",
                                marginBottom: "25px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "10px",
                            }}
                        >
                            Total
                        </h3>

                        <h3
                            style={{
                                fontSize: "24px",
                                fontWeight: "700",
                                textAlign: "center",
                                color: "#111827",
                                marginBottom: "25px",
                                display: "flex",
                                gap: "5px",
                            }}
                        >
                            <span style={{ color: "#0ea5e9" }}>
                                <FontAwesomeIcon
                                    style={{
                                        padding: 0,
                                        verticalAlign: -16,
                                        boxSizing: "border-box",
                                        display: "inline-block",
                                        marginRight: "0px",
                                    }}
                                    icon={faEarthAfrica}
                                />
                            </span>
                            <span>Missões</span>
                        </h3>
                        <InfoLinha
                            icon={faMoneyBill}
                            label="Missões Dinheiro"
                            value={(
                                dados.resumo_final.total_missoes_dinheiro || 0
                            ).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                        />
                        <InfoLinha
                            icon={faPix}
                            label="Missões Pix"
                            value={(
                                dados.resumo_final.total_missoes_pix || 0
                            ).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                        />
                        <InfoLinha
                            icon={faCalculator}
                            label="Total Missões"
                            value={(
                                dados.resumo_final.total_missoes || 0
                            ).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                        />

                        <hr
                            style={{
                                border: "none",
                                borderTop: "1px solid #f3f4f6",
                                margin: "15px 10px",
                            }}
                        />

                        <h3
                            style={{
                                fontSize: "24px",
                                fontWeight: "700",
                                textAlign: "center",
                                color: "#111827",
                                marginBottom: "25px",
                                display: "flex",
                                gap: "5px",
                            }}
                        >
                            <span style={{ color: "#10b981" }}>
                                <FontAwesomeIcon
                                    style={{
                                        padding: 0,
                                        verticalAlign: -16,
                                        boxSizing: "border-box",
                                        display: "inline-block",
                                        marginRight: "0px",
                                    }}
                                    icon={faCoins}
                                />
                            </span>
                            <span>Ofertas</span>
                        </h3>

                        <InfoLinha
                            icon={faMoneyBill}
                            label="Ofertas Dinheiro"
                            value={(
                                dados.resumo_final.total_ofertas_dinheiro || 0
                            ).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                        />
                        <InfoLinha
                            icon={faPix}
                            label="Ofertas Pix"
                            value={(
                                dados.resumo_final.total_ofertas_pix || 0
                            ).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                        />
                        <InfoLinha
                            icon={faCalculator}
                            label="Total Ofertas"
                            value={(
                                dados.resumo_final.total_ofertas || 0
                            ).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                        />

                        <hr
                            style={{
                                border: "none",
                                borderTop: "1px solid #f3f4f6",
                                margin: "15px 10px",
                            }}
                        />

                        <InfoLinha
                            icon={faSackDollar}
                            label="Total Geral"
                            value={(
                                dados.resumo_final.total || 0
                            ).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                        />

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "5px 10px",
                                position: "absolute",
                                transform: "translateX(-50%)",
                                bottom: 0,
                                left: "50%",
                                width: "100%",
                                borderTop: "1px solid #e5e7eb",
                                backgroundColor: "#ffffff",
                                marginBottom: "20px",
                                marginTop: "20px",
                            }}
                        >
                            <h2
                                style={{
                                    display: "flex",
                                    fontSize: "20px",
                                    fontWeight: "700",
                                    color: "#111827",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "10px",
                                    width: "100%",
                                }}
                            >
                                {igreja}
                                <span>{trimestre}</span>
                            </h2>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RelatorioTrimestralDownload;
