import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import "./dashboard-card.scss";
import { motion } from "framer-motion";

function DashboardCard({
    title,
    value,
    icon,
    datas,
    chartType = "area",
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
    datas: DashboardInterface[];
    chartType: "bar" | "area" | "pie";
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

    const dataKeys = Object.keys(datas[0] || {}).filter((v) => v !== "name");
    const condition =
        (chartType === "area" || datas.length >= 14) && datas.length > 1;

    return (
        <motion.div className="dashboard-card">
            <div className="dashboard-card__header">
                <div className="dashboard-card__icon">{icon}</div>
                <h2 className="dashboard-card__title">{title}</h2>
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
                                    labelFormatter={(i) => datas[i].name}
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
                                    labelFormatter={(i) => datas[i].name}
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
                                        radius={[4, 4, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>
        </motion.div>
    );
}

export default DashboardCard;
