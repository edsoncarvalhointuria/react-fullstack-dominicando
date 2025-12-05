import {
    faPaperPlane,
    faTriangleExclamation,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAuthContext } from "../../context/AuthContext";
import { FormProvider, useForm } from "react-hook-form";
import { getFunctions, httpsCallable } from "firebase/functions";
import "./confirmacao-modal.scss";
import { useState } from "react";
import LoadingModal from "../layout/loading/LoadingModal";
import { AnimatePresence, motion } from "framer-motion";

const functions = getFunctions();
const salvarRelatorioTrimestral = httpsCallable(
    functions,
    "salvarRelatorioTrimestral"
);

function ConfirmacaoModal({
    onCancel,
    onConfirm,
    setMenssageError,
    igrejaId,
    trimestreId,
    valorFinal,
}: {
    onCancel: () => void;
    onConfirm: () => void;
    setMenssageError: (error: string) => void;
    igrejaId: string;
    trimestreId: string;
    valorFinal: number;
}) {
    const [isEnviando, setIsEnviando] = useState(false);
    const { user } = useAuthContext();
    const methods = useForm<{
        confirmacao: boolean;
        valor_final: number;
        descricao?: string;
    }>();
    const {
        register,
        watch,
        setValue,
        handleSubmit,
        formState: { errors },
    } = methods;
    const { confirmacao, valor_final } = watch();

    const onSubmit = async (v: any) => {
        setIsEnviando(true);
        try {
            if (!v.confirmacao)
                throw new Error("Você precisa aceitar os termos de envio");
            await salvarRelatorioTrimestral({ ...v, igrejaId, trimestreId });
            onConfirm();
        } catch (error: any) {
            setMenssageError(error.message);
            onCancel();
        }
    };

    return (
        <motion.div
            className="confirmacao-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="confirmacao-modal">
                <LoadingModal isEnviando={isEnviando} />
                <div className="confirmacao-modal__header">
                    <div className="confirmacao-modal__title">
                        <span>
                            <FontAwesomeIcon icon={faPaperPlane} />
                        </span>
                        <h2>Enviar Relatório?</h2>
                    </div>

                    <button
                        className="confirmacao-modal__close"
                        disabled={isEnviando}
                        onClick={onCancel}
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>
                <FormProvider {...methods}>
                    <form
                        className="confirmacao-modal__body"
                        onSubmit={handleSubmit(onSubmit)}
                    >
                        <div className="confirmacao-modal__alerta">
                            <span>
                                <FontAwesomeIcon icon={faTriangleExclamation} />
                            </span>
                            <p>
                                <span>
                                    <strong>Atenção:</strong> O sistema calculou
                                    o total com base nos registros da chamada.
                                    Confira se esse valor está correto:{" "}
                                    <strong>
                                        {valorFinal.toLocaleString("pt-BR", {
                                            currency: "BRL",
                                            style: "currency",
                                        })}
                                    </strong>
                                </span>

                                <span>
                                    Se houver diferença, informe o valor real e
                                    adicione o motivo abaixo.
                                </span>
                            </p>
                        </div>

                        <div
                            className={`confirmacao-modal__valor ${
                                valor_final < valorFinal
                                    ? "confirmacao-modal__valor--abaixo"
                                    : ""
                            } ${
                                valor_final > valorFinal
                                    ? "confirmacao-modal__valor--maior"
                                    : ""
                            }`}
                        >
                            <label htmlFor="confirmacao-valor-final">
                                Valor Final
                            </label>
                            <input
                                type="number"
                                defaultValue={valorFinal}
                                step={0.01}
                                id="confirmacao-valor-final"
                                placeholder="Valor final"
                                {...register("valor_final", {
                                    required:
                                        "Você precisa digitar o valor final para salvar o relatório.",
                                    onBlur: (evt) => {
                                        const valor = Number(
                                            evt.target.value.replace(",", ".")
                                        );

                                        if (Number.isNaN(valor))
                                            setValue("valor_final", 0);
                                        else setValue("valor_final", valor);
                                    },
                                    valueAsNumber: true,
                                })}
                            />
                            {errors.valor_final && (
                                <div className="confirmacao-modal__error">
                                    <p>{errors.valor_final.message}</p>
                                </div>
                            )}
                        </div>

                        <AnimatePresence>
                            {(valor_final < valorFinal ||
                                valor_final > valorFinal) && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 10 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className={`confirmacao-modal__desc`}
                                    key={"confirmacao-descricao"}
                                >
                                    <label htmlFor="confirmacao-descricao">
                                        Justificativa
                                    </label>
                                    <textarea
                                        id="confirmacao-descricao"
                                        {...register("descricao", {
                                            required:
                                                !(
                                                    valor_final < valorFinal ||
                                                    valor_final > valorFinal
                                                ) ||
                                                "Você precisa adicionar uma justificativa para diferença de valor.",
                                        })}
                                    ></textarea>

                                    {errors.descricao && (
                                        <div className="confirmacao-modal__error">
                                            <p>{errors.descricao.message}</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="confirmacao-modal__confirmar">
                            <input
                                type="checkbox"
                                id="confirmacao-input"
                                {...register("confirmacao")}
                            />
                            <label htmlFor="confirmacao-input">
                                Eu, {user?.nome}, declaro que conferi os valores
                                e comprovantes e que eles correspondem à
                                realidade.
                            </label>
                        </div>

                        <div className="confirmacao-modal__buttons">
                            <button
                                className="confirmacao-modal__buttons--cancelar"
                                type="button"
                                disabled={isEnviando}
                                onClick={onCancel}
                            >
                                Cancelar
                            </button>
                            <button
                                className="confirmacao-modal__buttons--confirmar"
                                type="submit"
                                disabled={!confirmacao}
                            >
                                Enviar
                            </button>
                        </div>
                    </form>
                </FormProvider>
            </div>
        </motion.div>
    );
}

export default ConfirmacaoModal;
