import { Area, AreaChart, Bar, BarChart, Brush, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import "./dashboard-card-modal.scss";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine, faChartSimple, faLayerGroup, faXmark } from "@fortawesome/free-solid-svg-icons";
import React, { useMemo, useState } from "react";
import useIsMobile from "../../hooks/useIsMobile";
const CORES_GRAFICO = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#A855F7",
    "#14B8A6",
    "#FACC15",
    "#EC4899",
    "#22C55E",
    "#6366F1",
    "#F43F5E",
    "#0EA5E9",
    "#D946EF",
    "#84CC16",
];

const ChartComponents = ({ isMobile }: { isMobile: boolean }) => {
    return (
        <>
            <Tooltip
                cursor={{
                    stroke: "#3B82F6",
                    strokeWidth: 2,
                    strokeDasharray: "3 3",
                }}
                contentStyle={{
                    border: "1px solid #3B82F6",
                    borderRadius: "0.8rem",
                }}
                labelStyle={{ color: "#111827" }}
                formatter={(v) => (typeof v === "number" ? v.toLocaleString("pt-BR") : v)}
                labelFormatter={(_, j) => {
                    return (
                        <span
                            style={{
                                width: "100%",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 5,
                                gap: 2,
                            }}
                        >
                            <span>{j[0]?.payload?.name || 0}</span>

                            <strong
                                style={{
                                    padding: 5,
                                    fontWeight: 700,
                                    backgroundColor: "#10b981",
                                    fontSize: 12,
                                    borderRadius: 20,
                                }}
                            >
                                {j
                                    .reduce(
                                        (prev, current) =>
                                            (typeof current?.value === "number" ? current.value : 0) + prev,
                                        0,
                                    )
                                    .toLocaleString("pt-BR")}
                            </strong>
                        </span>
                    );
                }}
            />

            <XAxis
                dataKey={!isMobile ? "name" : undefined}
                type={isMobile ? "number" : "category"}
                height={60}
                style={{
                    fontSize: "9px",
                    textTransform: "capitalize",
                    fontFamily: "serif",
                    fill: "#111827",
                }}
            />

            <YAxis
                dataKey={isMobile ? "name" : undefined}
                tickLine={false}
                type={isMobile ? "category" : "number"}
                tick={(props) => {
                    const { x, y, payload } = props;
                    return (
                        <text
                            x={x}
                            y={y}
                            dy={4}
                            textAnchor="end"
                            fill="#111827"
                            style={{
                                fontSize: isMobile ? "10px" : "13px",
                                textTransform: "capitalize",
                                fontFamily: "serif",
                            }}
                        >
                            {payload.value}
                        </text>
                    );
                }}
            />

            <Brush dataKey="name" height={15} key={Math.random()} stroke="#3B82F6" fill="#F3F4F6" gap={5} />
        </>
    );
};

function DashboardCardModal({
    title,
    value,
    icon,
    datas,
    chartType,
    onClose,
}: {
    title: string;
    value?: string;
    icon?: React.ReactNode;
    datas: DashboardInterface[];
    chartType: "bar" | "area";
    onClose: () => void;
}) {
    const [stack, setStack] = useState(true);
    const [chart, setChart] = useState<"bar" | "area">(chartType);
    const isMobile = useIsMobile(500);
    const datasMemo = useMemo(() => {
        const dataList = datas.map((v) => {
            const total = Object.values(v).reduce(
                (prev, current) => (typeof current === "number" ? prev + current : prev),
                0,
            );
            return { ...v, total };
        });
        const keys = Object.keys(datas[0] || {}).filter((v) => v !== "name");
        return { dataList, keys };
    }, [datas]);
    return (
        <div className="dashboard-card-modal-overlay" onClick={onClose}>
            <motion.div className="dashboard-card-modal" layoutId={title} onClick={(evt) => evt.stopPropagation()}>
                <div className="dashboard-card-modal__header">
                    <div className="dashboard-card-modal__header--top">
                        <div className="dashboard-card-modal__infos">
                            <div className="dashboard-card-modal__title">
                                {icon && <div className="dashboard-card-modal__icon">{icon}</div>}
                                <h2 className="">{title}</h2>
                            </div>

                            <div className="dashboard-card-modal__container">
                                {value && (
                                    <div className="dashboard-card-modal__value">
                                        <p>{value}</p>
                                    </div>
                                )}

                                <div className="dashboard-card-modal__header--stack">
                                    <label htmlFor="dashboard-card-modal-check">
                                        <FontAwesomeIcon icon={faLayerGroup} />
                                    </label>
                                    <input
                                        type="checkbox"
                                        name="dashboard-card-modal-check"
                                        id="dashboard-card-modal-check"
                                        onChange={() => setStack((v) => !v)}
                                        readOnly
                                        checked={stack}
                                    />
                                </div>
                            </div>
                        </div>

                        <button className="dashboard-card-modal__header--close" onClick={onClose}>
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>

                    <div className="dashboard-card-modal__filtros">
                        <button
                            title="Gráfico de Barras"
                            className={`${chart === "bar" ? "selected" : ""}`}
                            onClick={() => setChart("bar")}
                        >
                            <FontAwesomeIcon icon={faChartSimple} />
                        </button>
                        <button
                            title="Gráfico de Linhas"
                            className={`${chart === "area" ? "selected" : ""}`}
                            onClick={() => setChart("area")}
                        >
                            <FontAwesomeIcon icon={faChartLine} />
                        </button>
                    </div>
                </div>

                <div className={`dashboard-card-modal__body`}>
                    <div className="dashboard-card-modal__chart">
                        <ResponsiveContainer width="100%" height="100%">
                            {chart === "area" ? (
                                <AreaChart data={datas} layout={isMobile ? "vertical" : "horizontal"}>
                                    <ChartComponents isMobile={isMobile} />
                                    {datasMemo.keys.map((v, i) => (
                                        <Area
                                            stackId={stack ? "name" : undefined}
                                            type="monotone"
                                            key={v + i}
                                            dataKey={v}
                                            fill={CORES_GRAFICO[i % CORES_GRAFICO.length]}
                                            stroke={CORES_GRAFICO[i % CORES_GRAFICO.length]}
                                        />
                                    ))}
                                </AreaChart>
                            ) : (
                                <BarChart
                                    data={datasMemo.dataList}
                                    layout={isMobile ? "vertical" : "horizontal"}
                                    margin={isMobile ? { right: 35 } : { top: 15 }}
                                >
                                    <ChartComponents isMobile={isMobile} />

                                    {datasMemo.keys.map((v, i) => (
                                        <Bar
                                            stackId={stack ? "name" : undefined}
                                            dataKey={v}
                                            key={v + i}
                                            fill={CORES_GRAFICO[i % CORES_GRAFICO.length]}
                                            radius={stack ? undefined : isMobile ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                                        >
                                            {i === datasMemo.keys.length - 1 && stack ? (
                                                <LabelList
                                                    position={isMobile ? "right" : "top"}
                                                    dataKey={"total"}
                                                    style={{
                                                        fontSize: "10px",
                                                        fontFamily: "serif",
                                                        fill: "#111827",
                                                    }}
                                                />
                                            ) : undefined}
                                        </Bar>
                                    ))}
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default DashboardCardModal;
