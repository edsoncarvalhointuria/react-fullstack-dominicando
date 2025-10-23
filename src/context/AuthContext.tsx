import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    reauthenticateWithCredential,
    EmailAuthProvider,
    getAuth,
    updatePassword,
    sendPasswordResetEmail,
} from "firebase/auth";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { app, auth, db } from "../utils/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { ROLES } from "../roles/Roles";

import type { AppUser } from "../interfaces/AppUser";
import { getFunctions, httpsCallable } from "firebase/functions";

export interface AuthType {
    user: AppUser | null;
    login: (email: string, senha: string) => Promise<void>;
    loginComGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    isSuperAdmin: React.RefObject<boolean>;
    isAdmin: React.RefObject<boolean>;
    isSecretario: React.RefObject<boolean>;
    alterarSenha: (senhaAntiga: string, senhaNova: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    mudarPermissaoNotificacao: () => Promise<void>;
}

const context = createContext({});
export const useAuthContext = () => useContext(context) as AuthType;

const functions = getFunctions();
const salvarNotificacao = httpsCallable(functions, "salvarNotificacao");

function AuthContext({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);

    const isSuperAdmin = useRef(false);
    const isAdmin = useRef(false);
    const isSecretario = useRef(false);

    const login = async (email: string, senha: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, senha);
        } catch (Error) {
            console.log(Error);
            throw Error;
        }
    };
    const loginComGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (Error) {
            console.log(Error);
            throw Error;
        }
    };
    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
        } catch (Error) {
            console.log(Error);
        }
    };
    const resetPassword = async (email: string) => {
        const auth = getAuth();

        try {
            const r = await sendPasswordResetEmail(auth, email);
            console.log(r);
        } catch (error) {
            console.log("deu esse erro", error);
            throw new Error("Email inválido");
        }
    };

    const alterarSenha = useCallback(
        async (senhaAntiga: string, novaSenha: string) => {
            if (!user) return;

            const currentUser = getAuth().currentUser;
            const credencial = EmailAuthProvider.credential(
                user.email!,
                senhaAntiga
            );
            try {
                await reauthenticateWithCredential(currentUser!, credencial);

                await updatePassword(currentUser!, novaSenha);
            } catch (error) {
                console.log("Erro ao alterar a senha", error);
                throw new Error("Houve um erro ao alterar a senha.");
            }
        },
        [user]
    );

    const mudarPermissaoNotificacao = async () => {
        await Notification.requestPermission();
        const permissao = Notification.permission;

        if (permissao !== "granted") {
            salvarNotificacao({ usuarioId: user!.uid, permissao });
            return console.log("Permissão não concedida");
        }
        const { getMessaging, getToken } = await import("firebase/messaging");
        await navigator.serviceWorker.register("/firebase-messaging-sw.js");

        const registration = await navigator.serviceWorker.ready;

        const messaging = getMessaging(app);

        const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        salvarNotificacao({ usuarioId: user!.uid, token, permissao });
    };

    useEffect(() => {
        const unscrible = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const usuarioDoc = doc(db, "usuarios", currentUser.uid);

                const unsubscribeOnSnapshot = onSnapshot(
                    usuarioDoc,
                    (usuarioSnap) => {
                        if (usuarioSnap.exists()) {
                            const usuario = usuarioSnap.data();

                            const appUser: AppUser = {
                                uid: currentUser.uid,
                                email: currentUser.email,
                                nome: currentUser.displayName || usuario.nome,
                                igrejaId: usuario.igrejaId,
                                igrejaNome: usuario.igrejaNome,
                                ministerioId: usuario.ministerioId,
                                role: usuario.role,
                                classeId: usuario.classeId,
                                classeNome: usuario.classeNome,
                            };

                            isSuperAdmin.current =
                                appUser.role === ROLES.PASTOR_PRESIDENTE ||
                                appUser.role === ROLES.SUPER_ADMIN;
                            isAdmin.current =
                                appUser.role === ROLES.PASTOR ||
                                appUser.role === ROLES.SECRETARIO_CONGREGACAO;
                            isSecretario.current =
                                appUser.role === ROLES.PROFESSOR ||
                                appUser.role === ROLES.SECRETARIO_CLASSE;

                            setUser(appUser);
                        } else {
                            signOut(auth);
                        }
                    },
                    (error) => {
                        console.error(
                            "Erro no listener do perfil do usuário:",
                            error
                        );
                        signOut(auth);
                    }
                );
                return () => unsubscribeOnSnapshot();
            }
        });

        return () => unscrible();
    }, []);
    return (
        <context.Provider
            value={{
                user,
                login,
                loginComGoogle,
                logout,
                isSuperAdmin,
                isAdmin,
                isSecretario,
                alterarSenha,
                resetPassword,
                mudarPermissaoNotificacao,
            }}
        >
            {children}
        </context.Provider>
    );
}

export default AuthContext;
