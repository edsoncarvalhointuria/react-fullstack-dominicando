import { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUsers,
    faUserCheck,
    faUserPlus,
    faBookBible,
    faBookOpen,
    faSackDollar,
    faCakeCandles,
    faListOl,
    faGhost,
    faAlarmClock,
    faEarthAfrica,
    faMoneyBill, // Adicionado para consistência
} from "@fortawesome/free-solid-svg-icons";
import "./relatorio-leitura.scss";
import type { ResponseGetRelatorioDominical } from "../../../interfaces/ResponseGetRelatorioDominical";
import { faPix } from "@fortawesome/free-brands-svg-icons";

import type { RegistroAulaInterface } from "../../../interfaces/RegistroAulaInterface";
import html2pdf from "html2pdf.js";

interface RelatorioLeituraProps {
    fila: (ClasseInterface & { id: string })[];
    dados: ResponseGetRelatorioDominical;
    domingo: Date;
    onSair: () => void;
}

const InfoLinha = ({
    icon,
    label,
    value,
    isMenor = false,
}: {
    icon: any;
    label: string;
    value: string | number;
    isMenor?: boolean;
}) => (
    <div
        style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            fontSize: "18px",
            padding: "15px 0",
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
                fontSize={"20px"}
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
        <div
            className={`${isMenor && "info-linha__valor--menor"}`}
            style={{
                fontWeight: "700",
                color: "#111827",
            }}
        >
            {value}
        </div>
    </div>
);

function RelatorioLeituraDownload({
    dados,
    domingo,
    onSair,
}: RelatorioLeituraProps) {
    const container = useRef<HTMLDivElement>(null);
    const classes: RegistroAulaInterface[] = [];
    dados.classes_relatorio.forEach((v) =>
        classes.push(dados.totais_classes[v.id])
    );
    const igreja = classes[0].igrejaNome;

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
            <div className="relatorio-leitura__body">
                <div
                    id="teste"
                    ref={container}
                    style={{
                        width: "100%",
                        maxWidth: "750px",
                    }}
                >
                    {classes.map((v: any) => (
                        <div
                            key={v.id}
                            style={{
                                minHeight: "297mm",
                                maxHeight: "297mm",
                                minWidth: "210mm",
                                maxWidth: "210mm",
                                backgroundColor: "#ffffff",
                                padding: "25px 30px",
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
                                {v.classeNome}
                            </h3>
                            <InfoLinha
                                icon={faUsers}
                                label="Matriculados"
                                value={v.total_matriculados || 0}
                            />
                            <InfoLinha
                                icon={faUserCheck}
                                label="Presentes"
                                value={v.presentes_chamada || 0}
                            />
                            <InfoLinha
                                icon={faUserPlus}
                                label="Visitantes"
                                value={v.visitas || 0}
                            />
                            <InfoLinha
                                icon={faAlarmClock}
                                label="Atrasados"
                                value={v.atrasados || 0}
                            />
                            <InfoLinha
                                icon={faGhost}
                                label="Ausentes"
                                value={v.total_ausentes || 0}
                            />
                            <hr
                                style={{
                                    border: "none",
                                    borderTop: "1px solid #f3f4f6",
                                    margin: "18px 0",
                                    marginBottom: 16,
                                }}
                            />
                            <InfoLinha
                                icon={faListOl}
                                label="Total de Pessoas"
                                value={v.total_presentes || 0}
                            />
                            <hr
                                style={{
                                    border: "none",
                                    borderTop: "1px solid #f3f4f6",
                                    margin: "18px 0",
                                }}
                            />
                            <InfoLinha
                                icon={faBookBible}
                                label="Bíblias"
                                value={v.biblias || 0}
                            />
                            <InfoLinha
                                icon={faBookOpen}
                                label="Revistas"
                                value={v.licoes_trazidas || 0}
                            />

                            <hr
                                style={{
                                    border: "none",
                                    borderTop: "1px solid #f3f4f6",
                                    margin: "18px 0",
                                }}
                            />

                            <InfoLinha
                                icon={faSackDollar}
                                label="Total Ofertas"
                                value={(v.ofertas_total || 0).toLocaleString(
                                    "pt-BR",
                                    {
                                        style: "currency",
                                        currency: "BRL",
                                    }
                                )}
                            />
                            <InfoLinha
                                icon={faEarthAfrica}
                                label="Total Missões"
                                value={(v.missoes_total || 0).toLocaleString(
                                    "pt-BR",
                                    {
                                        style: "currency",
                                        currency: "BRL",
                                    }
                                )}
                            />
                            <hr
                                style={{
                                    border: "none",
                                    borderTop: "1px solid #f3f4f6",
                                    margin: "25px 0",
                                }}
                            />
                            <InfoLinha
                                icon={faMoneyBill}
                                label="Ofertas Dinheiro"
                                value={(
                                    v.ofertas?.dinheiro || 0
                                ).toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                })}
                                isMenor={true}
                            />
                            <InfoLinha
                                icon={faMoneyBill}
                                label="Missões Dinheiro"
                                value={(
                                    v.missoes?.dinheiro || 0
                                ).toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                })}
                                isMenor={true}
                            />
                            <InfoLinha
                                icon={faPix}
                                label="Ofertas Pix"
                                value={(v.ofertas?.pix || 0).toLocaleString(
                                    "pt-BR",
                                    {
                                        style: "currency",
                                        currency: "BRL",
                                    }
                                )}
                                isMenor={true}
                            />
                            <InfoLinha
                                icon={faPix}
                                label="Missões Pix"
                                value={(v.missoes?.pix || 0).toLocaleString(
                                    "pt-BR",
                                    {
                                        style: "currency",
                                        currency: "BRL",
                                    }
                                )}
                                isMenor={true}
                            />

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "5px 10px",
                                    position: "static",
                                    width: "100%",
                                    borderTop: "1px solid #e5e7eb",
                                    backgroundColor: "#ffffff",
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
                                    <span
                                        style={{
                                            fontSize: "16px",
                                            color: "#6b7280",
                                            fontWeight: "400",
                                        }}
                                    >
                                        {domingo.toLocaleDateString("pt-BR", {
                                            dateStyle: "long",
                                        })}
                                    </span>
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
                            Totais Gerais
                        </h3>
                        <InfoLinha
                            icon={faUsers}
                            label="Total Matriculados"
                            value={dados.totais_gerais.total_matriculados || 0}
                        />
                        <InfoLinha
                            icon={faUserCheck}
                            label="Total Presentes"
                            value={dados.totais_gerais.presentes_chamada || 0}
                        />
                        <InfoLinha
                            icon={faUserPlus}
                            label="Total Visitantes"
                            value={dados.totais_gerais.visitas || 0}
                        />
                        <InfoLinha
                            icon={faAlarmClock}
                            label="Total Atrasados"
                            value={dados.totais_gerais.atrasados || 0}
                        />
                        <InfoLinha
                            icon={faGhost}
                            label="Total Ausentes"
                            value={dados.totais_gerais.total_ausentes || 0}
                        />
                        <hr
                            style={{
                                border: "none",
                                borderTop: "1px solid #f3f4f6",
                                margin: "18px 0",
                                marginBottom: 16,
                            }}
                        />
                        <InfoLinha
                            icon={faListOl}
                            label="Total de Pessoas"
                            value={dados.totais_gerais.total_presentes || 0}
                        />
                        <hr
                            style={{
                                border: "none",
                                borderTop: "1px solid #f3f4f6",
                                margin: "18px 0",
                            }}
                        />
                        <InfoLinha
                            icon={faBookBible}
                            label="Total Bíblias"
                            value={dados.totais_gerais.biblias || 0}
                        />
                        <InfoLinha
                            icon={faBookOpen}
                            label="Total Revistas"
                            value={dados.totais_gerais.licoes_trazidas || 0}
                        />
                        <hr
                            style={{
                                border: "none",
                                borderTop: "1px solid #f3f4f6",
                                margin: "18px 0",
                            }}
                        />
                        <InfoLinha
                            icon={faSackDollar}
                            label="Total Ofertas"
                            value={(
                                dados.totais_gerais.ofertas_total || 0
                            ).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                        />
                        <InfoLinha
                            icon={faEarthAfrica}
                            label="Total Missões"
                            value={(
                                dados.totais_gerais.missoes_total || 0
                            ).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                        />

                        <hr
                            style={{
                                border: "none",
                                borderTop: "1px solid #f3f4f6",
                                margin: "18px 0",
                            }}
                        />
                        <InfoLinha
                            icon={faMoneyBill}
                            label="Ofertas Dinheiro"
                            value={(
                                dados.totais_gerais.ofertas_dinheiro || 0
                            ).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                            isMenor={true}
                        />
                        <InfoLinha
                            icon={faMoneyBill}
                            label="Missões Dinheiro"
                            value={(
                                dados.totais_gerais.missoes_dinheiro || 0
                            ).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                            isMenor={true}
                        />
                        <InfoLinha
                            icon={faPix}
                            label="Ofertas Pix"
                            value={(
                                dados.totais_gerais.ofertas_pix || 0
                            ).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                            isMenor={true}
                        />

                        <InfoLinha
                            icon={faPix}
                            label="Missões Pix"
                            value={(
                                dados.totais_gerais.missoes_pix || 0
                            ).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                            isMenor={true}
                        />

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "5px 10px",
                                position: "static",
                                width: "100%",
                                borderTop: "1px solid #e5e7eb",
                                backgroundColor: "#ffffff",
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
                                <span
                                    style={{
                                        fontSize: "16px",
                                        color: "#6b7280",
                                        fontWeight: "400",
                                    }}
                                >
                                    {domingo.toLocaleDateString("pt-BR", {
                                        dateStyle: "long",
                                    })}
                                </span>
                            </h2>
                        </div>
                    </div>
                    <div
                        style={{
                            backgroundColor: "#ffffff",
                            padding: "30px 10px",
                            width: "100%",
                        }}
                    >
                        <h3
                            style={{
                                fontSize: "24px",
                                fontWeight: "700",
                                textAlign: "center",
                                color: "#111827",
                                marginBottom: "25px",
                            }}
                        >
                            <FontAwesomeIcon
                                icon={faCakeCandles}
                                color={"#3b82f6"}
                                style={{
                                    verticalAlign: -15,
                                    boxSizing: "border-box",
                                }}
                            />
                            <span> Aniversariantes da Semana</span>
                        </h3>
                        {dados.aniversariantes.length > 0 ? (
                            <ul
                                style={{
                                    listStyle: "none",
                                    padding: "0",
                                    textAlign: "center",
                                    fontSize: "18px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "15px",
                                }}
                            >
                                {dados.aniversariantes.map((aluno) => (
                                    <li
                                        key={aluno.id}
                                        style={{
                                            width: "100%",
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: "3px",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <p
                                            style={{
                                                textAlign: "left",
                                                paddingLeft: "10px",
                                            }}
                                        >
                                            <b style={{ fontWeight: 600 }}>
                                                {aluno.nome_completo}:
                                            </b>
                                        </p>
                                        <p
                                            style={{
                                                textAlign: "left",
                                                paddingLeft: "10px",
                                            }}
                                        >
                                            {
                                                aluno.data_nascimento as unknown as string
                                            }
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p
                                style={{
                                    textAlign: "center",
                                    fontSize: "16px",
                                    color: "#3b82f6",
                                    padding: "20px",
                                }}
                            >
                                Nenhum aniversariante esta semana.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RelatorioLeituraDownload;
