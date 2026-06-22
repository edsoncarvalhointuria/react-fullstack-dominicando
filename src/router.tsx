import { createBrowserRouter } from "react-router-dom";
import Loading from "./components/layout/loading/Loading";
import Login from "./components/pages/login/Login";
import ProtectRoute from "./components/config/ProtectRoute";
import React, { Suspense } from "react";
import App from "./App";

const DashboardLayout = React.lazy(() => import("./components/layout/DashboardLayout"));

const lazy = (imp: () => Promise<any>) => () => imp().then((c) => ({ Component: c.default }));
export const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        hydrateFallbackElement: <Loading />,
        children: [
            {
                index: true,
                element: <Login />,
            },
            {
                path: "/ranking-alunos/:igrejaId/:licaoId",
                lazy: lazy(() => import("./components/ranking/Ranking")),
            },
            {
                path: "/portal-aluno/:igrejaHash/:alunoHash",
                lazy: lazy(() => import("./components/pages/portal_aluno/PortalAluno")),
            },
            {
                path: "/ler-pdf",
                lazy: lazy(() => import("./components/pages/ler_pdf/LerPDF")),
            },
            {
                path: "/demo",
                lazy: lazy(() => import("./components/pages/demo/Demo")),
            },
            {
                path: "/cadastrar",
                children: [
                    {
                        path: "",
                        lazy: lazy(() => import("./components/pages/cadastrar/Cadastrar")),
                    },
                    {
                        path: "ministerio",
                        lazy: lazy(() => import("./components/pages/cadastrar/CadastrarMinisterio")),
                    },
                    {
                        path: "usuario/:codigo?",
                        lazy: lazy(() => import("./components/pages/cadastrar/CadastrarUsuario")),
                    },
                ],
            },

            {
                element: (
                    <ProtectRoute>
                        <Suspense fallback={<Loading />}>
                            <DashboardLayout />
                        </Suspense>
                    </ProtectRoute>
                ),

                children: [
                    { path: "/dashboard", lazy: lazy(() => import("./components/pages/dashboard/Dashboard")) },
                    {
                        path: "/aulas",
                        children: [
                            {
                                path: "igreja/:igrejaId?/classe?/:classeId?",
                                lazy: lazy(() => import("./components/pages/aulas/Aulas")),
                            },
                            {
                                path: ":igrejaId/:classeId/:licaoId/:numeroAula",
                                lazy: lazy(() => import("./components/pages/chamada/Chamada")),
                            },
                            {
                                path: "classe/:classeId?",
                                lazy: lazy(() => import("./components/pages/aulas/Aulas")),
                            },
                            {
                                path: "",
                                lazy: lazy(() => import("./components/pages/aulas/Aulas")),
                            },
                        ],
                    },
                    {
                        path: "/minha-conta",
                        lazy: lazy(() => import("./components/pages/minha_conta/MinhaConta")),
                    },
                    { path: "/igrejas", lazy: lazy(() => import("./components/pages/igrejas/Igrejas")) },
                    { path: "/classes", lazy: lazy(() => import("./components/pages/classes/Classes")) },
                    { path: "/membros", lazy: lazy(() => import("./components/pages/membros/Membros")) },
                    { path: "/alunos", lazy: lazy(() => import("./components/pages/alunos/Alunos")) },
                    { path: "/matriculas", lazy: lazy(() => import("./components/pages/matriculas/Matriculas")) },
                    { path: "/usuarios", lazy: lazy(() => import("./components/pages/usuarios/Usuarios")) },
                    { path: "/visitas", lazy: lazy(() => import("./components/pages/visitas/Visitas")) },
                    { path: "/notificacoes", lazy: lazy(() => import("./components/pages/notificacoes/Notificacoes")) },
                    { path: "/comprovantes", lazy: lazy(() => import("./components/pages/comprovantes/Comprovantes")) },
                    { path: "/trimestres", lazy: lazy(() => import("./components/pages/trimestres/Trimestres")) },
                    {
                        path: "/rotulos-classes",
                        lazy: lazy(() => import("./components/pages/rotulos_classes/RotulosClasses")),
                    },

                    {
                        path: "/relatorios",
                        children: [
                            {
                                path: "dominical/:igrejaId",
                                lazy: lazy(() => import("./components/pages/relatorios/RelatorioDominical")),
                            },
                            {
                                path: "dominical",
                                lazy: lazy(() => import("./components/pages/relatorios/RelatorioDominical")),
                            },
                            {
                                path: "trimestral/:igrejaId?",
                                lazy: lazy(() => import("./components/pages/relatorios/RelatorioTrimestral")),
                            },
                            {
                                path: "trimestral",
                                lazy: lazy(() => import("./components/pages/relatorios/RelatorioTrimestral")),
                            },
                            {
                                path: "graficos",
                                lazy: lazy(() => import("./components/pages/relatorios/RelatoriosGraficos")),
                            },
                            {
                                path: "csv",
                                lazy: lazy(() => import("./components/pages/relatorios/RelatorioCSV")),
                            },
                            {
                                path: "",
                                lazy: lazy(() => import("./components/pages/relatorios/Relatorios")),
                            },
                        ],
                    },

                    {
                        path: "/preparo",
                        children: [
                            { path: "", lazy: lazy(() => import("./components/pages/preparo/Preparo")) },
                            {
                                path: "licao/:licaoId/aula/:aulaId",
                                lazy: lazy(() => import("./components/pages/preparo/PreparoAula")),
                            },
                        ],
                    },

                    {
                        path: "/pedidos",
                        children: [
                            { path: "", lazy: lazy(() => import("./components/pages/pedidos/Pedidos")) },
                            {
                                path: "criar/:modeloId?",
                                lazy: lazy(() => import("./components/pages/pedidos/PedidosFormulario")),
                            },
                            {
                                path: "formulario/:modeloId",
                                lazy: lazy(() => import("./components/pages/pedidos/PedidosResposta")),
                            },
                            {
                                path: "formulario/:modeloId/:type",
                                lazy: lazy(() => import("./components/pages/pedidos/PedidosResposta")),
                            },
                        ],
                    },

                    {
                        path: "/licoes-globais",
                        lazy: lazy(() => import("./components/pages/licoes_globais/LicoesGlobais")),
                    },
                    {
                        path: "/portal-aluno",
                        children: [
                            { path: "", lazy: lazy(() => import("./components/pages/portal_aluno/GestaoPortal")) },
                            {
                                path: "igreja/:igrejaId",
                                lazy: lazy(() => import("./components/pages/portal_aluno/GestaoPortal")),
                            },
                        ],
                    },
                    {
                        path: "/ajuda",
                        children: [
                            { path: "", lazy: lazy(() => import("./components/pages/ajuda/Ajuda")) },
                            { path: ":ajudaId", lazy: lazy(() => import("./components/pages/ajuda/AjudaArtigo")) },
                        ],
                    },
                ],
            },
        ],
    },
]);
