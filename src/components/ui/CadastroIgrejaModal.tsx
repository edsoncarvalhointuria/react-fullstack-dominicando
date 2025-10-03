import { faCross, faXmark } from "@fortawesome/free-solid-svg-icons";
import "./cadastro-igreja-modal.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FormProvider, useForm } from "react-hook-form";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import LoadingModal from "../layout/loading/LoadingModal";
import AlertModal from "./AlertModal";

interface CadastroIgreja {
    nome: string;
}

const variantsContainer: Variants = {
    hidden: { opacity: 0, scale: 0 },
    visible: { opacity: 1, scale: 1 },
};

const variantsModal: Variants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
        scale: 1,
        opacity: 1,
        cursor: "grab",
        transition: { type: "spring", damping: 25, stiffness: 200 },
    },
    exit: { scale: 0.9, opacity: 0 },
};

const variantsErro: Variants = {
    hidden: { opacity: 0, y: -10, height: 0 },
    visible: { opacity: 1, y: 0, height: "auto" },
    exit: { opacity: 0, y: -10, height: 0 },
};

const functions = getFunctions();
const salvarIgreja = httpsCallable(functions, "salvarIgreja");

function CadastroIgrejaModal({
    igrejaId = "",
    onSave,
    onCancel,
}: {
    igrejaId?: string;
    onSave: (data: CadastroIgreja) => void;
    onCancel: () => void;
}) {
    const [isEnviando, setIsEnviando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState("");
    const methods = useForm<CadastroIgreja>();
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = methods;

    const $container = useRef<HTMLDivElement>(null);

    const onSubmit = (dados: CadastroIgreja) => {
        setIsEnviando(true);
        const envio = { dados, igrejaId };
        salvarIgreja(envio)
            .then(({ data }) => {
                const result = data as any;
                onSave(result);
                onCancel();
                console.log("igreja salva...");
            })
            .catch((err) => {
                console.log("deu esse erro", err);
                setMensagemErro(err.message);
            })
            .finally(() => setIsEnviando(false));
    };

    useEffect(() => {
        const getIgreja = async () => {
            const igrejaDoc = doc(db, "igrejas", igrejaId);
            const igrejaSnap = await getDoc(igrejaDoc);

            if (!igrejaSnap.exists()) return;

            const igreja = {
                id: igrejaSnap.id,
                ...igrejaSnap.data(),
            } as unknown as IgrejaInterface;

            reset({ nome: igreja.nome });
        };
        if (igrejaId) {
            getIgreja();
        } else {
            reset({ nome: "" });
        }
    }, [igrejaId, reset]);

    return (
        <>
            <motion.div
                className="cadastro-igreja-overlay"
                variants={variantsContainer}
                initial="hidden"
                animate="visible"
                exit="hidden"
                ref={$container}
                onClick={onCancel}
            >
                <motion.div
                    drag
                    dragConstraints={$container}
                    whileDrag={{ cursor: "grabbing" }}
                    className="cadastro-igreja"
                    variants={variantsModal}
                    onClick={(e) => e.stopPropagation()}
                >
                    <LoadingModal isEnviando={isEnviando} />
                    <div className="cadastro-igreja__header">
                        <div className="cadastro-igreja__title">
                            <FontAwesomeIcon icon={faCross} />
                            <h2>
                                {igrejaId
                                    ? "Editar Igreja"
                                    : "Cadastrar Igreja"}
                            </h2>
                        </div>
                        <button
                            className="cadastro-igreja__close"
                            onClick={onCancel}
                        >
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>

                    <div className="cadastro-igreja__body">
                        <FormProvider {...methods}>
                            <form
                                className="cadastro-igreja__form"
                                onSubmit={handleSubmit(onSubmit)}
                            >
                                <div className="cadastro-igreja__form-item cadastro-igreja__form-item--full">
                                    <div className="cadastro-igreja__form-input">
                                        <label htmlFor="cadastro-igreja-nome">
                                            Nome da Igreja*
                                        </label>
                                        <input
                                            type="text"
                                            id="cadastro-igreja-nome"
                                            className={
                                                errors.nome ? "input-error" : ""
                                            }
                                            {...register("nome", {
                                                required:
                                                    "O nome da igreja é obrigatório",
                                                minLength: {
                                                    value: 3,
                                                    message:
                                                        "O nome precisa ter no mínimo 3 caracteres",
                                                },
                                            })}
                                        />
                                    </div>
                                    <AnimatePresence>
                                        {errors.nome && (
                                            <motion.div
                                                variants={variantsErro}
                                                initial="hidden"
                                                animate="visible"
                                                exit="hidden"
                                                className="cadastro-igreja__form-input--erro"
                                            >
                                                <p>{errors.nome.message}</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="cadastro-igreja__buttons">
                                    <button
                                        type="button"
                                        className="button-secondary"
                                        onClick={onCancel}
                                        disabled={isEnviando}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="button-primary"
                                        disabled={isEnviando}
                                    >
                                        {igrejaId
                                            ? "Salvar Alterações"
                                            : "Salvar Igreja"}
                                    </button>
                                </div>
                            </form>
                        </FormProvider>
                    </div>
                </motion.div>
            </motion.div>

            <AlertModal
                isOpen={!!mensagemErro}
                message={mensagemErro}
                title="Erro ao salvar"
                onCancel={onCancel}
                onClose={onCancel}
                onConfirm={onCancel}
                cancelText="Cancelar"
                confirmText="Ok"
            />
        </>
    );
}

export default CadastroIgrejaModal;
