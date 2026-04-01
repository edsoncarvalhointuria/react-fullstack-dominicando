import { useEffect, useState } from "react";
import "./cadastro-classe-modal.scss";
import { motion } from "framer-motion";
import { FormProvider, useForm } from "react-hook-form";

import { doc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { faChalkboardUser, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { getFunctions, httpsCallable } from "firebase/functions";
import LoadingModal from "../layout/loading/LoadingModal";
import AlertModal from "./AlertModal";

interface Form {
    nome: string;
    idade_minima?: number;
    idade_maxima?: number;
}
const functions = getFunctions();
const salvarRotuloClasse = httpsCallable(functions, "salvarRotuloClasse");

function CadastroRotuloModal({
    onCancel,
    onSave,
    rotuloId = "",
}: {
    onSave: (any: RotulosClassesInterface) => void;
    onCancel: () => void;
    rotuloId?: string;
}) {
    const methods = useForm<Form>();
    const {
        reset,
        handleSubmit,
        register,
        watch,
        formState: { errors },
    } = methods;

    const { idade_minima, idade_maxima } = watch();
    const [isEnviando, setIsEnviando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState("");

    const onSubmit = (dados: Form) => {
        dados.idade_minima = Number.isNaN(dados.idade_minima)
            ? undefined
            : dados.idade_minima;
        dados.idade_maxima = Number.isNaN(dados.idade_maxima)
            ? undefined
            : dados.idade_maxima;
        setIsEnviando(true);
        salvarRotuloClasse({ dados, rotuloId })
            .then(({ data }) => {
                const resultado = data as any;
                onSave(resultado);
                onCancel();
                console.log("classe salva...");
            })
            .catch((err) => {
                console.log("deu esse erro", err);
                setMensagemErro(err.message);
            })
            .finally(() => setIsEnviando(false));
    };

    useEffect(() => {
        const getRotuloClasse = async () => {
            const d = doc(db, "rotulos_classes", rotuloId);
            const snap = await getDoc(d);

            if (!snap.exists()) return;

            const rotulo = {
                id: snap.id,
                ...snap.data(),
            } as RotulosClassesInterface;

            if (rotulo.nome === "OUTRO") onCancel();

            return rotulo;
        };
        if (rotuloId)
            getRotuloClasse()
                .then((v) => {
                    reset({
                        nome: v?.nome,
                        idade_maxima: v?.idade_maxima,
                        idade_minima: v?.idade_minima,
                    });
                })
                .catch((err) => {
                    console.log("deu esse erro", err);
                    onCancel();
                });
    }, []);

    return (
        <>
            <div className="classe-modal-overlay" onClick={onCancel}>
                <motion.div
                    className="classe-modal"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                >
                    <LoadingModal isEnviando={isEnviando} />
                    <div className="classe-modal__header">
                        <h2>
                            <FontAwesomeIcon icon={faChalkboardUser} />
                            {rotuloId
                                ? "Editar Rótulo"
                                : "Cadastrar Novo Rótulo"}
                        </h2>
                        <button
                            className="classe-modal__close-btn"
                            onClick={onCancel}
                            title="Fechar"
                        >
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>

                    <FormProvider {...methods}>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <div className="classe-modal__body">
                                <div className="classe-modal__input-group">
                                    <label htmlFor="nome-rotulo">
                                        Nome do Rótulo <span>*</span>
                                    </label>
                                    <input
                                        className={errors.nome && "input-error"}
                                        id="nome-rotulo"
                                        type="text"
                                        {...register("nome", {
                                            required:
                                                "O nome do rótulo é obrigatório",
                                            minLength: {
                                                value: 3,
                                                message:
                                                    "O nome deve ter pelo menos 3 caracteres.",
                                            },
                                        })}
                                    />
                                    {errors.nome && (
                                        <p className="classe-modal__input-erro">
                                            {errors.nome.message}
                                        </p>
                                    )}
                                </div>

                                <div className="classe-modal__inputs">
                                    <div className="classe-modal__input-group">
                                        <label htmlFor="idade-minima-rotulo">
                                            Idade Mínima
                                            {idade_maxima ? (
                                                <span> *</span>
                                            ) : (
                                                <i> (não obrigatório)</i>
                                            )}
                                        </label>
                                        <input
                                            className={
                                                errors.idade_minima &&
                                                "input-error"
                                            }
                                            id="idade-minima-rotulo"
                                            type="number"
                                            {...register("idade_minima", {
                                                min: {
                                                    value: 0,
                                                    message:
                                                        "Idade mínima inválida",
                                                },
                                                valueAsNumber: true,
                                                required: idade_maxima
                                                    ? "Idade mínima é obrigatória"
                                                    : false,
                                            })}
                                        />
                                        {errors.idade_minima && (
                                            <p className="classe-modal__input-erro">
                                                {errors.idade_minima.message}
                                            </p>
                                        )}
                                    </div>

                                    <div className="classe-modal__input-group">
                                        <label htmlFor="idade-maxima-classe">
                                            Idade Máxima{" "}
                                            {idade_maxima ? (
                                                <></>
                                            ) : (
                                                <i>(não obrigatório)</i>
                                            )}
                                        </label>
                                        <input
                                            className={
                                                errors.idade_maxima &&
                                                "input-error"
                                            }
                                            id="idade-maxima-classe"
                                            type="number"
                                            {...register("idade_maxima", {
                                                min: {
                                                    value: idade_minima || 0,
                                                    message:
                                                        "Idade máxima inválida",
                                                },
                                                valueAsNumber: true,
                                            })}
                                        />
                                        {errors.idade_maxima && (
                                            <p className="classe-modal__input-erro">
                                                {errors.idade_maxima.message}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="classe-modal__footer">
                                <button
                                    disabled={isEnviando}
                                    type="button"
                                    className="button-secondary"
                                    onClick={onCancel}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="button-primary"
                                    disabled={isEnviando}
                                >
                                    {rotuloId
                                        ? "Salvar Alterações"
                                        : "Criar Rótulo"}
                                </button>
                            </div>
                        </form>
                    </FormProvider>
                </motion.div>
            </div>
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

export default CadastroRotuloModal;
