import { useEffect, useRef, useState } from "react";
import "./cadastro-classe-modal.scss";
import { motion } from "framer-motion";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { useDataContext } from "../../context/DataContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { faChalkboardUser, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Dropdown from "./Dropdown";
import { getFunctions, httpsCallable } from "firebase/functions";
import LoadingModal from "../layout/loading/LoadingModal";
import AlertModal from "./AlertModal";

interface Form {
    igrejaId: string;
    nome: string;
    idade_minima: number;
    idade_maxima: number;
}
const functions = getFunctions();
const salvarClasse = httpsCallable(functions, "salvarClasse");

function CadastroClasseModal({
    classeId = "",
    onCancel,
    onSelect,
    igrejaId = undefined,
}: {
    classeId?: string;
    onSelect: (any: ClasseInterface) => void;
    onCancel: () => void;
    igrejaId?: string;
}) {
    const { igrejas } = useDataContext();
    const methods = useForm<Form>();
    const {
        reset,
        handleSubmit,
        register,
        setValue,
        watch,
        control,
        formState: { errors },
    } = methods;

    const { idade_minima, idade_maxima } = watch();
    const $container = useRef<HTMLDivElement>(null);
    const [isEnviando, setIsEnviando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState("");

    const onSubmit = (dados: Form) => {
        setIsEnviando(true);
        const envio = { dados, classeId };
        salvarClasse(envio)
            .then(({ data }) => {
                const resultado = data as any;
                onSelect(resultado);
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
        const getClasse = async (classeId: string) => {
            const d = doc(db, "classes", classeId);
            const snap = await getDoc(d);

            if (!snap.exists()) return;

            const classe = { id: snap.id, ...snap.data() } as ClasseInterface;

            return classe;
        };
        if (classeId)
            getClasse(classeId)
                .then((v) => {
                    reset({
                        nome: v?.nome,
                        idade_maxima: v?.idade_maxima,
                        idade_minima: v?.idade_minima,
                        igrejaId: v?.igrejaId,
                    });
                })
                .catch((err) => {
                    console.log("deu esse erro", err);
                    onCancel();
                });
        else if (igrejas.find((v) => v.id === igrejaId)) {
            setValue("igrejaId", igrejaId || "");
        }
    }, [classeId, igrejaId]);

    return (
        <>
            <div
                className="classe-modal-overlay"
                ref={$container}
                onClick={onCancel}
            >
                <motion.div
                    drag
                    dragConstraints={$container}
                    whileDrag={{ cursor: "grabbing" }}
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
                            {classeId
                                ? "Editar Classe"
                                : "Cadastrar Nova Classe"}
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
                                    <label htmlFor="nome-classe">
                                        Nome da Classe*
                                    </label>
                                    <input
                                        className={errors.nome && "input-error"}
                                        id="nome-classe"
                                        type="text"
                                        {...register("nome", {
                                            required:
                                                "O nome da classe é obrigatório.",
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
                                        <label htmlFor="idade-minima-classe">
                                            Idade Mínima{" "}
                                            {idade_maxima ? "*" : ""}
                                        </label>
                                        <input
                                            className={
                                                errors.idade_minima &&
                                                "input-error"
                                            }
                                            id="idade-minima-classe"
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
                                            {idade_minima ? "*" : ""}
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
                                                    value: idade_minima,
                                                    message:
                                                        "Idade máxima inválida",
                                                },
                                                valueAsNumber: true,
                                                required: idade_minima
                                                    ? "Idade máxima é obrigatória"
                                                    : false,
                                            })}
                                        />
                                        {errors.idade_maxima && (
                                            <p className="classe-modal__input-erro">
                                                {errors.idade_maxima.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div
                                    className={`classe-modal__input-group ${
                                        errors.igrejaId && "input-error"
                                    }`}
                                >
                                    <label htmlFor="igreja-classe">
                                        Igreja*
                                    </label>
                                    <Controller
                                        name="igrejaId"
                                        control={control}
                                        rules={{
                                            required: "A igreja é obrigatória.",
                                        }}
                                        render={({ field }) => (
                                            <Dropdown
                                                lista={igrejas}
                                                current={
                                                    igrejas.find(
                                                        (v) =>
                                                            v.id === field.value
                                                    )?.nome || null
                                                }
                                                isAll={false}
                                                isErro={!!errors.igrejaId}
                                                onSelect={(response) =>
                                                    field.onChange(
                                                        response?.id || null
                                                    )
                                                }
                                            />
                                        )}
                                    />
                                    {errors.igrejaId && (
                                        <p className="classe-modal__input-erro">
                                            {errors.igrejaId.message}
                                        </p>
                                    )}
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
                                    {classeId
                                        ? "Salvar Alterações"
                                        : "Criar Classe"}
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

export default CadastroClasseModal;
