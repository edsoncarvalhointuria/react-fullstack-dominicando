interface ResponseGetDashboard {
    total_ofertas: DashboardInterface[];
    total_missoes: DashboardInterface[];
    total_presentes: DashboardInterface[];
    total_biblias: DashboardInterface[];
    total_licoes: DashboardInterface[];
    total_matriculados: DashboardInterface[];
    total_membros_matriculados: {
        [key: string]: {
            total_membros: number;
            total_matriculados: number;
            engajamento: number | string;
        };
    };
}
