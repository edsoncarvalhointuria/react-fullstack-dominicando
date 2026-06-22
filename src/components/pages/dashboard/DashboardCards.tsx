import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAuthContext } from "../../../context/AuthContext";
import DashboardCard from "../../ui/DashboardCard";
import type { StateCharts } from "./Dashboard";
import {
    faAddressCard,
    faBook,
    faBookBible,
    faClipboardCheck,
    faGhost,
    faListCheck,
    faPlane,
    faSackDollar,
} from "@fortawesome/free-solid-svg-icons";

const ChartMembros = ({
    value,
}: {
    value: {
        [key: string]: {
            total_membros: number;
            total_matriculados: number;
            engajamento: number | string;
        };
    };
}) => {
    const dados = Object.values(value || {});

    let totalMatriculados = 0;
    let totalMembrosCadastrados = 0;

    dados.forEach((v) => {
        totalMatriculados += v.total_matriculados;
        totalMembrosCadastrados += v.total_membros;
    });

    const data = [
        {
            name: "Matriculados",
            value: totalMatriculados,
        },
        {
            name: "Não Matriculados",
            value: totalMembrosCadastrados - totalMatriculados,
        },
    ];

    return (
        <DashboardCard
            value={`${((totalMatriculados / totalMembrosCadastrados) * 100 || 0).toFixed(1)}%`}
            title="Total Membros Matriculados"
            icon={<FontAwesomeIcon icon={faAddressCard} />}
            datas={data}
            chartType="pie"
        />
    );
};
const sum = (array: DashboardInterface[]) => {
    return array?.reduce(
        (total, obj) => total + Object.values(obj).reduce((sum, acc) => (typeof acc === "number" ? sum + acc : sum), 0),
        0,
    );
};

function DashboardCards({ charts }: { charts: StateCharts | null }) {
    const { isSecretario } = useAuthContext();

    return (
        <>
            <DashboardCard
                withIndex={!isSecretario.current}
                value={sum(charts?.total_ofertas || []).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                })}
                title="Total Ofertas"
                icon={<FontAwesomeIcon icon={faSackDollar} />}
                datas={charts?.total_ofertas || []}
                chartType="bar"
            />

            <DashboardCard
                withIndex={!isSecretario.current}
                value={sum(charts?.total_missoes || []).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                })}
                title="Total Missões"
                icon={<FontAwesomeIcon icon={faPlane} />}
                datas={charts?.total_missoes || []}
                chartType="bar"
            />

            <DashboardCard
                withIndex={!isSecretario.current}
                value={Math.floor(
                    sum(charts?.total_presentes || []) / (charts?.total_presentes || []).length,
                ).toString()}
                title="Total Presentes"
                icon={<FontAwesomeIcon icon={faListCheck} />}
                datas={charts?.total_presentes || []}
                chartType="area"
            />
            <DashboardCard
                withIndex={!isSecretario.current}
                value={Math.floor(sum(charts?.total_ausentes || []) / (charts?.total_ausentes || []).length).toString()}
                title="Total Ausentes"
                icon={<FontAwesomeIcon icon={faGhost} />}
                datas={charts?.total_ausentes || []}
                chartType="area"
            />

            <DashboardCard
                withIndex={!isSecretario.current}
                value={sum(charts?.total_matriculados || []).toString()}
                title="Total Matriculados"
                icon={<FontAwesomeIcon icon={faClipboardCheck} />}
                datas={charts?.total_matriculados || []}
                chartType="bar"
            />

            {!isSecretario.current && <ChartMembros value={charts?.total_membros_matriculados || {}} />}

            <DashboardCard
                withIndex={!isSecretario.current}
                value={Math.floor(sum(charts?.total_licoes || []) / (charts?.total_licoes || []).length).toString()}
                title="Total Revistas"
                icon={<FontAwesomeIcon icon={faBook} />}
                datas={charts?.total_licoes || []}
                chartType="bar"
            />

            <DashboardCard
                withIndex={!isSecretario.current}
                value={Math.floor(sum(charts?.total_biblias || []) / (charts?.total_biblias || []).length).toString()}
                title="Total Bíblias"
                icon={<FontAwesomeIcon icon={faBookBible} />}
                datas={charts?.total_biblias || []}
                chartType="bar"
            />
        </>
    );
}

export default DashboardCards;
