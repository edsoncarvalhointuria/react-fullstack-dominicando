import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    Brush,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import "./dashboard-card-modal.scss";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faChartLine,
    faChartSimple,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import useIsMobile from "../../hooks/useIsMobile";

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
    const CORES_GRAFICO = [
        "#3B82F6",
        "#10B981",
        "#F59E0B",
        "#EF4444",
        "#D946EF",
        "#FACC15",
        "#EC4899",
        "#22C55E",
        "#14B8A6",
        "#6366F1",
        "#F43F5E",
        "#0EA5E9",
        "#84CC16",
        "#A855F7",
    ];

    const [chart, setChart] = useState<"bar" | "area">(chartType);
    const isMobile = useIsMobile(500);

    const dataKeys = Object.keys(datas[0] || {}).filter((v) => v !== "name");
    return (
        <div className="dashboard-card-modal-overlay" onClick={onClose}>
            <motion.div
                className="dashboard-card-modal"
                layoutId={title}
                onClick={(evt) => evt.stopPropagation()}
            >
                <div className="dashboard-card-modal__header">
                    <div className="dashboard-card-modal__header--top">
                        <div className="dashboard-card-modal__infos">
                            <div className="dashboard-card-modal__title">
                                {icon && (
                                    <div className="dashboard-card-modal__icon">
                                        {icon}
                                    </div>
                                )}
                                <h2 className="">{title}</h2>
                            </div>
                            {value && (
                                <div className="dashboard-card-modal__value">
                                    <p>{value}</p>
                                </div>
                            )}
                        </div>

                        <button
                            className="dashboard-card-modal__header--close"
                            onClick={onClose}
                        >
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
                                <AreaChart
                                    data={datas}
                                    layout={
                                        isMobile ? "vertical" : "horizontal"
                                    }
                                >
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
                                        labelFormatter={(_, j) => {
                                            return (
                                                <span
                                                    style={{
                                                        width: "100%",
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        alignItems: "center",
                                                        marginBottom: 5,
                                                        gap: 2,
                                                    }}
                                                >
                                                    <span>
                                                        {j[0]?.payload?.name ||
                                                            0}
                                                    </span>

                                                    <strong
                                                        style={{
                                                            padding: 5,
                                                            fontWeight: 700,
                                                            backgroundColor:
                                                                "#10b981",
                                                            fontSize: 12,
                                                            borderRadius: 20,
                                                        }}
                                                    >
                                                        {j.reduce(
                                                            (prev, current) =>
                                                                (typeof current?.value ===
                                                                "number"
                                                                    ? current.value
                                                                    : 0) + prev,
                                                            0
                                                        )}
                                                    </strong>
                                                </span>
                                            );
                                        }}
                                    />
                                    {isMobile ? (
                                        <>
                                            <XAxis type="number" />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={80}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                        </>
                                    )}

                                    <Brush
                                        dataKey="name"
                                        height={15}
                                        key={Math.random()}
                                        stroke="#3B82F6"
                                    />

                                    {dataKeys.map((v, i) => (
                                        <Area
                                            type="monotone"
                                            key={v + i}
                                            dataKey={v}
                                            fill={
                                                CORES_GRAFICO[
                                                    i % CORES_GRAFICO.length
                                                ]
                                            }
                                            stroke={
                                                CORES_GRAFICO[
                                                    i % CORES_GRAFICO.length
                                                ]
                                            }
                                        />
                                    ))}
                                </AreaChart>
                            ) : (
                                <BarChart
                                    data={datas}
                                    layout={
                                        isMobile ? "vertical" : "horizontal"
                                    }
                                >
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
                                        labelFormatter={(_, j) => {
                                            return (
                                                <span
                                                    style={{
                                                        width: "100%",
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        alignItems: "center",
                                                        marginBottom: 5,
                                                        gap: 2,
                                                    }}
                                                >
                                                    <span>
                                                        {j[0]?.payload?.name ||
                                                            0}
                                                    </span>

                                                    <strong
                                                        style={{
                                                            padding: 5,
                                                            fontWeight: 700,
                                                            backgroundColor:
                                                                "#10b981",
                                                            fontSize: 12,
                                                            borderRadius: 20,
                                                        }}
                                                    >
                                                        {j.reduce(
                                                            (prev, current) =>
                                                                (typeof current?.value ===
                                                                "number"
                                                                    ? current.value
                                                                    : 0) + prev,
                                                            0
                                                        )}
                                                    </strong>
                                                </span>
                                            );
                                        }}
                                    />
                                    {isMobile ? (
                                        <>
                                            <XAxis type="number" />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={80}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                        </>
                                    )}
                                    <Brush
                                        dataKey="name"
                                        height={15}
                                        stroke="#3B82F6"
                                        key={Math.random()}
                                    />

                                    {dataKeys.map((v, i) => (
                                        <Bar
                                            dataKey={v}
                                            key={v + i}
                                            fill={
                                                CORES_GRAFICO[
                                                    i % CORES_GRAFICO.length
                                                ]
                                            }
                                            radius={
                                                isMobile
                                                    ? [0, 4, 4, 0]
                                                    : [4, 4, 0, 0]
                                            }
                                        />
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
