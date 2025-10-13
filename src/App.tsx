import { useEffect, useState } from "react";
import Login from "./components/pages/login/Login";
import { useAuthContext } from "./context/AuthContext";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Dashboard from "./components/pages/dashboard/Dashboard";
import ProtectRoute from "./components/config/ProtectRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import { AnimatePresence } from "framer-motion";
import Aulas from "./components/pages/aulas/Aulas";
import Chamada from "./components/pages/chamada/Chamada";
import Alunos from "./components/pages/alunos/Alunos";
import Igrejas from "./components/pages/igrejas/Igrejas";
import Relatorios from "./components/pages/relatorios/Relatorios";
import RelatorioDominical from "./components/pages/relatorios/RelatorioDominical";
import Classes from "./components/pages/classes/Classes";
import Usuarios from "./components/pages/usuarios/Usuarios";
import RelatoriosGraficos from "./components/pages/relatorios/RelatoriosGraficos";
import Matriculas from "./components/pages/matriculas/Matriculas";
import RelatorioCSV from "./components/pages/relatorios/RelatorioCSV";
import MinhaConta from "./components/pages/minha_conta/MinhaConta";
import Visitas from "./components/pages/visitas/Visitas";
import Cadastrar from "./components/pages/cadastrar/Cadastrar";
import CadastrarMinisterio from "./components/pages/cadastrar/CadastrarMinisterio";
import CadastrarUsuario from "./components/pages/cadastrar/CadastrarUsuario";
import Membros from "./components/pages/membros/Membros";
import Comprovantes from "./components/pages/comprovantes/Comprovantes";
import PWReloadPrompt from "./components/layout/PWA/PWReloadPrompt";
import InstallModal from "./components/ui/InstallModal";
import Notificacoes from "./components/pages/notificacoes/Notificacoes";
// import { app } from "./utils/firebase";

function App() {
    const [promptInstall, setPromptInstall] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);

    const { user, mudarPermissaoNotificacao } = useAuthContext();
    const navigate = useNavigate();
    const location = useLocation();
    const { pathname } = location;
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    useEffect(() => {
        if (!user) return;

        const from = location.state?.from;
        if (from) navigate(from);
        else navigate("/dashboard");

        if ("permissions" in navigator) {
            navigator.permissions
                .query({
                    name: "notifications",
                })
                .then((v) => {
                    v.onchange = mudarPermissaoNotificacao;
                });
        }

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

        return () => {
            if ("permissions" in navigator) {
                navigator.permissions
                    .query({
                        name: "notifications",
                    })
                    .then((v) => {
                        if (v) v.onchange = null;
                    });
            }
        };
    }, [user]);
    useEffect(() => {
        const event = (evt: Event) => {
            if (promptInstall) return;
            evt.preventDefault();
            setPromptInstall(evt);
            setShowModal(true);
        };

        if (!promptInstall)
            window.addEventListener("beforeinstallprompt", event);

        return () => window.removeEventListener("beforeinstallprompt", event);
    }, [promptInstall]);

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
            <AnimatePresence>
                <Routes>
                    <Route path="/" key={location.key} element={<Login />} />

                    <Route path="/cadastrar">
                        <Route
                            path=""
                            element={<Cadastrar />}
                            key={location.key}
                        />
                        <Route
                            path="ministerio"
                            element={<CadastrarMinisterio />}
                            key={location.key}
                        />
                        <Route
                            path="usuario/:codigo?"
                            element={<CadastrarUsuario />}
                            key={location.key}
                        />
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
                            <Route
                                children
                                path=":igrejaId/:classeId/:licaoId/:numeroAula"
                                element={<Chamada />}
                            />
                            <Route
                                children
                                path="classe/:classeId?"
                                element={<Aulas />}
                            />
                            <Route
                                path=""
                                element={<Aulas key={location.key} />}
                            />
                        </Route>

                        <Route path="minha-conta" element={<MinhaConta />} />

                        <Route path="/igrejas" element={<Igrejas />} />
                        <Route path="/classes" element={<Classes />} />
                        <Route path="/membros" element={<Membros />} />
                        <Route path="/alunos" element={<Alunos />} />
                        <Route path="/matriculas" element={<Matriculas />} />
                        <Route path="/usuarios" element={<Usuarios />} />
                        <Route path="/visitas" element={<Visitas />} />
                        <Route
                            path="/notificacoes"
                            element={<Notificacoes />}
                        />
                        <Route
                            path="/comprovantes"
                            element={<Comprovantes />}
                        />
                        <Route path="/relatorios">
                            <Route
                                path="dominical/:igrejaId"
                                element={<RelatorioDominical />}
                            />
                            <Route
                                path="dominical"
                                element={<RelatorioDominical />}
                            />
                            <Route
                                path="graficos"
                                element={<RelatoriosGraficos />}
                            />
                            <Route path="csv" element={<RelatorioCSV />} />
                            <Route path="" element={<Relatorios />} />
                        </Route>
                    </Route>
                </Routes>
            </AnimatePresence>
        </main>
    );
}

export default App;
