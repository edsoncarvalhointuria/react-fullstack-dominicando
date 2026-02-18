import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    Brush,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import "./dashboard-card.scss";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpRightAndDownLeftFromCenter } from "@fortawesome/free-solid-svg-icons";
import React, { useState } from "react";
import DashboardCardModal from "./DashboardCardModal";

function DashboardCard({
    title,
    value,
    icon,
    datas,
    chartType = "area",
    withIndex = false,
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
    datas: DashboardInterface[];
    chartType: "bar" | "area" | "pie";
    withIndex?: boolean;
}) {
    const CORES_GRAFICO = [
        "#3B82F6",
        "#10B981",
        "#F59E0B",
        "#EF4444",
        "#14B8A6",
        "#FACC15",
        "#EC4899",
        "#22C55E",
        "#6366F1",
        "#F43F5E",
        "#0EA5E9",
        "#D946EF",
        "#84CC16",
        "#A855F7",
    ];
    const [expandirCard, setExpandirCard] = useState(false);
    const dataKeys = Object.keys(datas[0] || {}).filter((v) => v !== "name");
    const condition =
        (chartType === "area" || datas.length >= 14) && datas.length > 1;
    const index = withIndex ? Math.max(0, datas.length - 5) : 0;

    return (
        <>
            <motion.div className="dashboard-card" layoutId={title}>
                <div className="dashboard-card__header">
                    <div className="dashboard-card__infos">
                        <div className="dashboard-card__icon">{icon}</div>
                        <h2 className="dashboard-card__title">{title}</h2>
                    </div>

                    {chartType !== "pie" ? (
                        <div className="dashboard-card__expandir">
                            <button onClick={() => setExpandirCard(true)}>
                                <FontAwesomeIcon
                                    icon={faUpRightAndDownLeftFromCenter}
                                />
                            </button>
                        </div>
                    ) : (
                        <></>
                    )}
                </div>

                <div
                    className={`dashboard-card__body dashboard-card__body--${chartType}`}
                >
                    <p className="dashboard-card__value">{value}</p>
                    <div className="dashboard-card__chart">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === "pie" ? (
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
                                        labelFormatter={(i) => datas[i].name}
                                    />

                                    <Pie
                                        data={datas}
                                        nameKey="name"
                                        dataKey="value"
                                        innerRadius="60%"
                                        outerRadius="90%"
                                        isAnimationActive={false}
                                    >
                                        {datas.map((_, i) => (
                                            <Cell
                                                key={i}
                                                fill={
                                                    CORES_GRAFICO[
                                                        i +
                                                            (1 %
                                                                CORES_GRAFICO.length)
                                                    ]
                                                }
                                            />
                                        ))}
                                    </Pie>
                                </PieChart>
                            ) : condition ? (
                                <AreaChart data={datas}>
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
                                                        gap: 5,
                                                        marginBottom: 5,
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
                                                            0,
                                                        )}
                                                    </strong>
                                                </span>
                                            );
                                        }}
                                    />

                                    <Brush
                                        dataKey="name"
                                        height={15}
                                        key={Math.random()}
                                        stroke="#3B82F6"
                                        startIndex={index}
                                    />

                                    {dataKeys.map((v, i) => (
                                        <Area
                                            isAnimationActive={false}
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
                                <BarChart data={datas}>
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
                                                        gap: 5,
                                                        marginBottom: 5,
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
                                                            0,
                                                        )}
                                                    </strong>
                                                </span>
                                            );
                                        }}
                                    />

                                    <Brush
                                        dataKey="name"
                                        height={15}
                                        stroke="#3B82F6"
                                        key={Math.random()}
                                        startIndex={index}
                                    />

                                    {dataKeys.map((v, i) => (
                                        <Bar
                                            isAnimationActive={false}
                                            dataKey={v}
                                            key={v + i}
                                            fill={
                                                CORES_GRAFICO[
                                                    i % CORES_GRAFICO.length
                                                ]
                                            }
                                            radius={[4, 4, 0, 0]}
                                        />
                                    ))}
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>
            </motion.div>
            <AnimatePresence>
                {expandirCard && (
                    <DashboardCardModal
                        chartType={chartType as any}
                        onClose={() => setExpandirCard(false)}
                        {...{ title, value, icon, datas }}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

export default React.memo(DashboardCard);
