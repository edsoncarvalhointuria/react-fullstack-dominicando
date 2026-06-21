import { useEffect, useState } from "react";
import LoadingVideo from "../../layout/loading/LoadingVideo";
import { browserSessionPersistence, onAuthStateChanged, setPersistence, signInWithCustomToken } from "firebase/auth";
import { auth, functions } from "../../../utils/firebase";
import { httpsCallable } from "firebase/functions";
import { motion, type Variants } from "framer-motion";
import "./texto-demo.scss";

const getTokenDemo = httpsCallable(functions, "getTokenDemo");

const textoVariants: Variants = {
    initial: { y: 0 },
    animate: (i: number) => ({
        y: [0, -12, 0],
        transition: {
            duration: 0.6,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 2,
            delay: i * 0.05,
        },
    }),
};

const TextoDemo = ({ texto }: { texto: string }) => {
    return (
        <div className="texto-demo" key={texto}>
            <p className="texto-demo__texto">
                {texto.split("").map((v, i) => (
                    <motion.span
                        variants={textoVariants}
                        initial="initial"
                        animate="animate"
                        custom={i}
                        key={`${v}-${i}`}
                    >
                        {v === " " ? <>&nbsp;</> : v}
                    </motion.span>
                ))}
            </p>
        </div>
    );
};

export default function Demo() {
    const [texto, setTexto] = useState("Carregando usuário...");

    useEffect(() => {
        const unsubscrible = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) return;
            await setPersistence(auth, browserSessionPersistence);

            try {
                const { data } = await getTokenDemo();
                const token = (data as any).token;
                await signInWithCustomToken(auth, token);
            } catch (error: any) {
                console.log("houve um erro", error);
                setTexto("Erro ao carregar...");
            }
        });

        return () => unsubscrible();
    }, []);
    return (
        <LoadingVideo isOpen>
            <TextoDemo texto={texto} />
        </LoadingVideo>
    );
}
