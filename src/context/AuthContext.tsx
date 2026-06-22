import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    reauthenticateWithCredential,
    EmailAuthProvider,
    updatePassword,
    sendPasswordResetEmail,
    // getIdTokenResult,
    getIdToken,
} from "firebase/auth";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { app, auth, db, functions } from "../utils/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { ROLES } from "../roles/Roles";
import type { AppUser } from "../interfaces/AppUser";
import { httpsCallable } from "firebase/functions";
import type { UsuarioInterface } from "../interfaces/UsuarioInterface";

export interface AuthType {
    user: AppUser | null;
    login: (email: string, senha: string) => Promise<void>;
    loginComGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    isSuperAdmin: React.RefObject<boolean>;
    isAdmin: React.RefObject<boolean>;
    isLoadingAuth: boolean;
    isSecretario: React.RefObject<boolean>;
    alterarSenha: (senhaAntiga: string, senhaNova: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    mudarPermissaoNotificacao: () => Promise<void>;
}

const context = createContext({});
export const useAuthContext = () => useContext(context) as AuthType;

const salvarNotificacao = httpsCallable(functions, "salvarNotificacao");

const loginComGoogle = async () => {
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    } catch (Error) {
        console.log(Error);
        throw Error;
    }
};
const resetPassword = async (email: string) => {
    try {
        const r = await sendPasswordResetEmail(auth, email);
        console.log(r);
    } catch (error) {
        console.log("deu esse erro", error);
        throw new Error("Email inválido");
    }
};
const mudarPermissaoNotificacao = async () => {
    await Notification.requestPermission();
    const permissao = Notification.permission;

    if (permissao !== "granted") {
        salvarNotificacao({ usuarioId: auth.currentUser?.uid, permissao });
        return console.log("Permissão não concedida");
    }
    const { getMessaging, getToken } = await import("firebase/messaging");
    await navigator.serviceWorker.register("/firebase-messaging-sw-v2.js");

    const registration = await navigator.serviceWorker.ready;

    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
    });

    salvarNotificacao({ usuarioId: auth.currentUser?.uid, token, permissao });
};

function AuthContext({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    // const navigate = useNavigate();

    const isSuperAdmin = useRef(false);
    const isAdmin = useRef(false);
    const isSecretario = useRef(false);

    const login = useCallback(async (email: string, senha: string) => {
        setIsLoadingAuth(true);
        try {
            await signInWithEmailAndPassword(auth, email, senha);
        } catch (Error) {
            console.log(Error);
            throw Error;
        } finally {
            setIsLoadingAuth(false);
        }
    }, []);
    const logout = useCallback(async () => {
        try {
            await signOut(auth);
            setUser(null);
        } catch (Error) {
            console.log(Error);
        }
    }, []);
    const alterarSenha = useCallback(
        async (senhaAntiga: string, novaSenha: string) => {
            if (!user) return;

            const currentUser = auth.currentUser;
            const credencial = EmailAuthProvider.credential(user.email!, senhaAntiga);
            try {
                await reauthenticateWithCredential(currentUser!, credencial);

                await updatePassword(currentUser!, novaSenha);
            } catch (error) {
                console.log("Erro ao alterar a senha", error);
                throw new Error("Houve um erro ao alterar a senha.");
            }
        },
        [user],
    );

    useEffect(() => {
        let unscribeSnapShot: () => void | undefined;

        const unscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const usuarioDoc = doc(db, "usuarios", currentUser.uid || "");

                // const token = await getIdTokenResult(currentUser);
                // console.log(currentUser);

                // console.log(token);
                // console.log(token.claims);

                unscribeSnapShot = onSnapshot(
                    usuarioDoc,
                    (usuarioSnap) => {
                        if (usuarioSnap.exists()) {
                            const usuario = usuarioSnap.data() as UsuarioInterface;
                            const horaLocalStorage = Number(localStorage.getItem("ultima_atualizacao")) || 0;

                            if (usuario.atualizacao !== horaLocalStorage) {
                                getIdToken(currentUser, true);
                                localStorage.setItem("ultima_atualizacao", usuario.atualizacao.toString());
                            }

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
                                appUser.role === ROLES.PASTOR_PRESIDENTE || appUser.role === ROLES.SUPER_ADMIN;
                            isAdmin.current =
                                appUser.role === ROLES.PASTOR || appUser.role === ROLES.SECRETARIO_CONGREGACAO;
                            isSecretario.current =
                                appUser.role === ROLES.PROFESSOR || appUser.role === ROLES.SECRETARIO_CLASSE;

                            setUser(appUser);
                        } else {
                            signOut(auth);
                        }

                        setIsLoadingAuth(false);
                    },
                    (error) => {
                        console.error("Erro no listener do perfil do usuário:", error);
                        signOut(auth);
                    },
                );
            } else setIsLoadingAuth(false);
        });

        return () => {
            unscribe();
            if (unscribeSnapShot) unscribeSnapShot();
        };
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
                isLoadingAuth,
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
