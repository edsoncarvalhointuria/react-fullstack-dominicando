import "./components/pages/alunos/alunos.scss";
import InstallModal from "./components/ui/InstallModal";
import { AnimatePresence } from "framer-motion";
import { lazy, useEffect, useState } from "react";
import AuthContext, { useAuthContext } from "./context/AuthContext";
import DataContext from "./context/DataContext";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const PWReloadPrompt = lazy(() => import("./components/layout/PWA/PWReloadPrompt"));

function AppContent() {
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

            <Outlet />
        </main>
    );
}

function App() {
    return (
        <AuthContext>
            <DataContext>
                <AppContent />
            </DataContext>
        </AuthContext>
    );
}
export default App;
