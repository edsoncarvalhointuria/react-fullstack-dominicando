import "./components/pages/alunos/alunos.scss";
import Login from "./components/pages/login/Login";
import Cadastrar from "./components/pages/cadastrar/Cadastrar";
import CadastrarUsuario from "./components/pages/cadastrar/CadastrarUsuario";
import CadastrarMinisterio from "./components/pages/cadastrar/CadastrarMinisterio";
import ProtectRoute from "./components/config/ProtectRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import PWReloadPrompt from "./components/layout/PWA/PWReloadPrompt";
import InstallModal from "./components/ui/InstallModal";
import { AnimatePresence } from "framer-motion";
import { lazy, useEffect, useState } from "react";
import { useAuthContext } from "./context/AuthContext";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import videoLoading from "/loop.mp4";

const Demo = lazy(() => import("./components/pages/demo/Demo"));
const LerPDF = lazy(() => import("./components/pages/ler_pdf/LerPDF"));
const Dashboard = lazy(() => import("./components/pages/dashboard/Dashboard"));
const LicoesGlobais = lazy(() => import("./components/pages/licoes_globais/LicoesGlobais"));
const Aulas = lazy(() => import("./components/pages/aulas/Aulas"));
const Chamada = lazy(() => import("./components/pages/chamada/Chamada"));
const Alunos = lazy(() => import("./components/pages/alunos/Alunos"));
const Igrejas = lazy(() => import("./components/pages/igrejas/Igrejas"));
const Relatorios = lazy(() => import("./components/pages/relatorios/Relatorios"));
const RelatorioDominical = lazy(() => import("./components/pages/relatorios/RelatorioDominical"));
const Classes = lazy(() => import("./components/pages/classes/Classes"));
const Usuarios = lazy(() => import("./components/pages/usuarios/Usuarios"));
const RelatoriosGraficos = lazy(() => import("./components/pages/relatorios/RelatoriosGraficos"));
const Matriculas = lazy(() => import("./components/pages/matriculas/Matriculas"));
const RelatorioCSV = lazy(() => import("./components/pages/relatorios/RelatorioCSV"));
const MinhaConta = lazy(() => import("./components/pages/minha_conta/MinhaConta"));
const Visitas = lazy(() => import("./components/pages/visitas/Visitas"));
const Membros = lazy(() => import("./components/pages/membros/Membros"));
const Comprovantes = lazy(() => import("./components/pages/comprovantes/Comprovantes"));
const Notificacoes = lazy(() => import("./components/pages/notificacoes/Notificacoes"));
const Ajuda = lazy(() => import("./components/pages/ajuda/Ajuda"));
const AjudaArtigo = lazy(() => import("./components/pages/ajuda/AjudaArtigo"));
const Preparo = lazy(() => import("./components/pages/preparo/Preparo"));
const PreparoAula = lazy(() => import("./components/pages/preparo/PreparoAula"));
const RelatorioTrimestral = lazy(() => import("./components/pages/relatorios/RelatorioTrimestral"));
const Trimestres = lazy(() => import("./components/pages/trimestres/Trimestres"));
const RotulosClasses = lazy(() => import("./components/pages/rotulos_classes/RotulosClasses"));
const Pedidos = lazy(() => import("./components/pages/pedidos/Pedidos"));
const PedidosFormulario = lazy(() => import("./components/pages/pedidos/PedidosFormulario"));
const PedidosResposta = lazy(() => import("./components/pages/pedidos/PedidosResposta"));
const Ranking = lazy(() => import("./components/ranking/Ranking"));
const GestaoPortal = lazy(() => import("./components/pages/portal_aluno/GestaoPortal"));
const PortalAluno = lazy(() => import("./components/pages/portal_aluno/PortalAluno"));

function App() {
    const [promptInstall, setPromptInstall] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);

    const { user } = useAuthContext();
    const navigate = useNavigate();
    const location = useLocation();
    const { pathname } = location;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    useEffect(() => {
        if (!user || location.pathname.includes("/portal-aluno/")) return;

        const from = location.state?.from;
        if (from) navigate(from);
        else navigate("/dashboard");

        // if ("permissions" in navigator) {
        //     navigator.permissions
        //         .query({
        //             name: "notifications",
        //         })
        //         .then((v) => {
        //             v.onchange = mudarPermissaoNotificacao;
        //         })
        //         .catch((v) => console.log("deu erro", v));
        // }

        // if ("serviceWorker" in navigator) {
        //     const setupOnMessageListener = async () => {
        //         const { getMessaging, onMessage } = await import(
        //             "firebase/messaging"
        //         );

        //         const messaging = getMessaging(app);
        //         return onMessage(messaging, (payload) => {
        //             new Notification(
        //                 payload.notification?.title || "Nova Notificação",
        //                 {
        //                     body: payload.notification?.body || "",
        //                     icon:
        //                         payload.notification?.icon ||
        //                         "/web-app-manifest-192x192.png",
        //                 }
        //             );
        //         });
        //     };

        //     let unsubscribe: any;
        //     setupOnMessageListener().then((v) => (unsubscribe = v));

        //     return () => {
        //         if (unsubscribe) unsubscribe();

        //         if ("permissions" in navigator) {
        //             navigator.permissions
        //                 .query({
        //                     name: "notifications",
        //                 })
        //                 .then((v) => {
        //                     if (v) v.onchange = null;
        //                 });
        //         }
        //     };
        // }

        // return () => {
        //     if ("permissions" in navigator) {
        //         navigator.permissions
        //             .query({
        //                 name: "notifications",
        //             })
        //             .then((v) => {
        //                 if (v) v.onchange = null;
        //             }).catch((v)=>console.log('deu esse erri')
        //             );
        //     }
        // };
    }, [user]);
    useEffect(() => {
        const event = (evt: Event) => {
            if (promptInstall) return;
            evt.preventDefault();
            setPromptInstall(evt);
            setShowModal(true);
        };

        if (!promptInstall) window.addEventListener("beforeinstallprompt", event);

        return () => window.removeEventListener("beforeinstallprompt", event);
    }, [promptInstall]);
    useEffect(() => {
        fetch(videoLoading);
    }, []);
    return (
        <main>
            <PWReloadPrompt />
            <AnimatePresence>
                {promptInstall && showModal && (
                    <InstallModal
                        onConfirm={async () => {
                            if (!promptInstall) return;

                            promptInstall.prompt();

                            setShowModal(false);

                            const { outcome } = await promptInstall.userChoice;
                            if (outcome === "accepted") {
                                console.log("Usuário aceitou a instalação!");
                            } else {
                                console.log("Usuário recusou a instalação.");
                            }

                            setPromptInstall(null);
                        }}
                        onClose={() => {
                            setShowModal(false);
                        }}
                        key={"modal-instalar-app"}
                    />
                )}
            </AnimatePresence>

            <Routes>
                <Route path="/" key={location.key} element={<Login />} />
                <Route path="/ranking-alunos/:igrejaId/:licaoId" key={location.key} element={<Ranking />} />
                <Route path="/portal-aluno/:igrejaHash/:alunoHash" key={location.key} element={<PortalAluno />} />
                <Route path="/ler-pdf" element={<LerPDF />} />
                <Route path="/demo" element={<Demo />} />

                <Route path="/cadastrar">
                    <Route path="" element={<Cadastrar />} key={location.key} />
                    <Route path="ministerio" element={<CadastrarMinisterio />} key={location.key} />
                    <Route path="usuario/:codigo?" element={<CadastrarUsuario />} key={location.key} />
                </Route>

                <Route
                    element={
                        <ProtectRoute>
                            <DashboardLayout />
                        </ProtectRoute>
                    }
                >
                    <Route path="/dashboard" element={<Dashboard />} />

                    <Route path="/aulas">
                        <Route
                            children
                            path="igreja/:igrejaId?/classe?/:classeId?"
                            element={<Aulas key={location.key} />}
                        />
                        <Route children path=":igrejaId/:classeId/:licaoId/:numeroAula" element={<Chamada />} />
                        <Route children path="classe/:classeId?" element={<Aulas />} />
                        <Route path="" element={<Aulas key={location.key} />} />
                    </Route>

                    <Route path="minha-conta" element={<MinhaConta />} />

                    {/* Gestão */}
                    <Route path="/igrejas" element={<Igrejas />} />
                    <Route path="/classes" element={<Classes />} />
                    <Route path="/membros" element={<Membros />} />
                    <Route path="/alunos" element={<Alunos />} />
                    <Route path="/matriculas" element={<Matriculas />} />
                    <Route path="/usuarios" element={<Usuarios />} />
                    <Route path="/visitas" element={<Visitas />} />
                    <Route path="/notificacoes" element={<Notificacoes />} />
                    <Route path="/comprovantes" element={<Comprovantes />} />
                    <Route path="/trimestres" element={<Trimestres />} />
                    <Route path="/rotulos-classes" element={<RotulosClasses />} />

                    <Route path="/relatorios">
                        <Route path="dominical/:igrejaId" element={<RelatorioDominical />} />
                        <Route path="dominical" element={<RelatorioDominical />} />
                        <Route path="trimestral/:igrejaId?" element={<RelatorioTrimestral />} />
                        <Route path="trimestral" element={<RelatorioTrimestral />} />
                        <Route path="graficos" element={<RelatoriosGraficos />} />
                        <Route path="csv" element={<RelatorioCSV />} />
                        <Route path="" element={<Relatorios />} />
                    </Route>

                    <Route path="/preparo">
                        <Route path="" element={<Preparo />} />
                        <Route path="licao/:licaoId/aula/:aulaId" element={<PreparoAula />} />
                    </Route>

                    <Route path="/pedidos">
                        <Route path="" element={<Pedidos />} />
                        <Route path="criar/:modeloId?" element={<PedidosFormulario />} />
                        <Route path="formulario/:modeloId" element={<PedidosResposta />} />
                        <Route path="formulario/:modeloId/:type" element={<PedidosResposta />} />
                    </Route>

                    <Route path="/licoes-globais">
                        <Route path="" element={<LicoesGlobais />} />
                    </Route>

                    <Route path="/portal-aluno">
                        <Route path="" element={<GestaoPortal />} />
                        <Route path="igreja/:igrejaId" element={<GestaoPortal />} />
                    </Route>

                    <Route path="/ajuda">
                        <Route element={<Ajuda />} path="" />
                        <Route element={<AjudaArtigo key={location.key} />} path=":ajudaId" />
                    </Route>
                </Route>
            </Routes>
        </main>
    );
}

export default App;
