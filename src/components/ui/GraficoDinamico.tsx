import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import "./grafico-dinamico.scss";
import useIsMobile from "../../hooks/useIsMobile";
import { motion } from "framer-motion";

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip">
                <p className="custom-tooltip__label">{label}</p>
                {payload.map((p: any, i: number) => (
                    <div key={i} className="custom-tooltip__item">
                        <div className="custom-tooltip__item-label">
                            {p.name.split("|").map((v: string, i: number) => (
                                <span key={i}>{v}</span>
                            ))}
                        </div>
                        <p
                            className="custom-tooltip__item-value"
                            style={{ color: p.color }}
                        >
                            {p.value}
                        </p>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const CustomLegend = ({ payload }: any) => {
    return (
        <div className="custom-legend">
            {payload.map((entry: any, i: number) => (
                <div key={`item-${i}`} className="custom-legend__item">
                    <div
                        className="custom-legend__swatch"
                        style={{ backgroundColor: entry.color }}
                    />
                    <div className="custom-legend__label">
                        {entry.value
                            .split("|")
                            .map((part: string, i: number) => (
                                <span key={i}>{part}</span>
                            ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

interface Props {
    dados: ({ name: string } & { [key: string]: number })[];
    title: string;
    tipoGrafico: "bar" | "line" | "pie";
}
function GraficoDinamico({ dados, tipoGrafico, title }: Props) {
    const CORES_GRAFICO = [
        "#3B82F6", // Azul
        "#10B981", // Verde Esmeralda
        "#F97316", // Laranja Vibrante
        "#8B5CF6", // Roxo
        "#E11D48", // Rosa Avermelhado
        "#14B8A6", // Ciano
        "#FACC15", // Amarelo
        "#EC4899", // Rosa
        "#22C55E", // Verde Lima
        "#6366F1", // Indigo
        "#F43F5E", // Vermelho Rosado
        "#0EA5E9", // Azul Céu
        "#D946EF", // Fúcsia
        "#84CC16", // Verde Amarelado
        "#A855F7", // Violeta
    ];
    const isMobile = useIsMobile();

    return (
        <motion.div layoutId={title}>
            <ResponsiveContainer width="100%" height={isMobile ? 600 : 500}>
                {(() => {
                    const chaves = Array.from(
                        new Set(dados.map((v) => Object.keys(v)).flat())
                    ).filter((v) => v !== "name");

                    switch (tipoGrafico) {
                        case "bar":
                            return (
                                <BarChart
                                    data={dados}
                                    margin={{
                                        bottom: isMobile ? 100 : 20,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="name"
                                        {...(isMobile
                                            ? {
                                                  angle: 90,
                                                  textAnchor: "start",
                                                  height: 80,
                                              }
                                            : {})}
                                    />
                                    {!isMobile && <YAxis />}
                                    <Tooltip
                                        position={{ y: isMobile ? 200 : 20 }}
                                        content={<CustomTooltip />}
                                        cursor={{
                                            stroke: "#3B82F6",
                                            strokeWidth: 1,
                                            strokeDasharray: "3 3",
                                        }}
                                        contentStyle={{
                                            border: "1px solid #3B82F6",
                                            borderRadius: "0.8rem",
                                        }}
                                        labelStyle={{ color: "#111827" }}
                                        labelFormatter={(i) => i}
                                    />
                                    <Legend
                                        content={<CustomLegend />}
                                        verticalAlign={
                                            isMobile ? "top" : "bottom"
                                        }
                                        wrapperStyle={{
                                            paddingBottom: isMobile
                                                ? "1.5rem"
                                                : "0",
                                        }}
                                    />
                                    {chaves.length > 1 ? (
                                        chaves.map((v, i) => (
                                            <Bar
                                                key={v + i}
                                                dataKey={v}
                                                barSize={60}
                                                fill={
                                                    CORES_GRAFICO[
                                                        v.includes(" dinheiro")
                                                            ? (i - 1) %
                                                              CORES_GRAFICO.length
                                                            : i %
                                                              CORES_GRAFICO.length
                                                    ]
                                                }
                                            />
                                        ))
                                    ) : (
                                        <Bar
                                            dataKey={chaves[0]}
                                            fill={CORES_GRAFICO[0]}
                                            barSize={60}
                                        />
                                    )}
                                </BarChart>
                            );
                        case "line":
                            return (
                                <LineChart
                                    data={dados}
                                    margin={{
                                        bottom: isMobile ? 100 : 20,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="name"
                                        {...(isMobile
                                            ? {
                                                  angle: 90,
                                                  textAnchor: "start",
                                                  height: 80,
                                              }
                                            : {})}
                                    />
                                    {!isMobile && <YAxis />}
                                    <Tooltip
                                        position={{ y: isMobile ? 200 : 20 }}
                                        cursor={{
                                            stroke: "#3B82F6",
                                            strokeWidth: 1,
                                            strokeDasharray: "3 3",
                                        }}
                                        contentStyle={{
                                            border: "1px solid #3B82F6",
                                            borderRadius: "0.8rem",
                                        }}
                                        labelStyle={{ color: "#111827" }}
                                        content={<CustomTooltip />}
                                    />
                                    <Legend
                                        content={<CustomLegend />}
                                        verticalAlign={
                                            isMobile ? "top" : "bottom"
                                        }
                                        wrapperStyle={{
                                            paddingBottom: isMobile
                                                ? "1.5rem"
                                                : "0",
                                        }}
                                    />
                                    {chaves.length > 1 ? (
                                        chaves.map((v, i) => (
                                            <Line
                                                dataKey={v}
                                                key={v + i}
                                                type="monotone"
                                                strokeWidth={2}
                                                activeDot={{ r: 8 }}
                                                stroke={
                                                    CORES_GRAFICO[
                                                        v.includes(" dinheiro")
                                                            ? (i - 1) %
                                                              CORES_GRAFICO.length
                                                            : i %
                                                              CORES_GRAFICO.length
                                                    ]
                                                }
                                            />
                                        ))
                                    ) : (
                                        <Line
                                            dataKey={chaves[0]}
                                            type="monotone"
                                            strokeWidth={2}
                                            activeDot={{ r: 8 }}
                                            stroke={CORES_GRAFICO[0]}
                                        />
                                    )}
                                </LineChart>
                            );
                        case "pie":
                            return (
                                <PieChart>
                                    <Tooltip
                                        position={{ y: 20 }}
                                        cursor={{
                                            stroke: "#3B82F6",
                                            strokeWidth: 1,
                                            strokeDasharray: "3 3",
                                        }}
                                        contentStyle={{
                                            border: "1px solid #3B82F6",
                                            borderRadius: "0.8rem",
                                        }}
                                        labelStyle={{ color: "#111827" }}
                                        content={<CustomTooltip />}
                                    />
                                    <Legend content={<CustomLegend />} />

                                    {chaves.length > 1 ? (
                                        (() => {
                                            const dadosMap = new Map();
                                            dados.forEach((d) => {
                                                chaves.forEach((v) => {
                                                    const valor = dadosMap.get(
                                                        v
                                                    ) || { name: v };
                                                    valor.total =
                                                        (valor.total || 0) +
                                                        (d[v] || 0);
                                                    dadosMap.set(v, valor);
                                                });
                                            });

                                            const dadosAtualizados = Array.from(
                                                dadosMap.values()
                                            );

                                            return (
                                                <Pie
                                                    data={dadosAtualizados}
                                                    dataKey="total"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius="85%"
                                                    label
                                                >
                                                    {dadosAtualizados.map(
                                                        (_, i) => (
                                                            <Cell
                                                                key={i}
                                                                fill={
                                                                    CORES_GRAFICO[
                                                                        i %
                                                                            CORES_GRAFICO.length
                                                                    ]
                                                                }
                                                            />
                                                        )
                                                    )}
                                                </Pie>
                                            );
                                        })()
                                    ) : (
                                        <Pie
                                            data={dados}
                                            dataKey={chaves[0]}
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius="90%"
                                            label
                                        >
                                            {dados.map((_, i) => (
                                                <Cell
                                                    key={i}
                                                    fill={
                                                        CORES_GRAFICO[
                                                            i %
                                                                CORES_GRAFICO.length
                                                        ]
                                                    }
                                                />
                                            ))}
                                        </Pie>
                                    )}
                                </PieChart>
                            );
                    }
                })()}
            </ResponsiveContainer>
        </motion.div>
    );
}

export default GraficoDinamico;
