import { faPaperPlane, faXmark } from "@fortawesome/free-solid-svg-icons";
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
    "salvarRelatorioTrimestral",
);

function ConfirmacaoModal({
    onCancel,
    onConfirm,
    setMenssageError,
    igrejaId,
    trimestreId,
    valorFinalMissao,
    valorFinalOferta,
    numeroMes,
    nomeMes,
}: {
    onCancel: () => void;
    onConfirm: () => void;
    setMenssageError: (error: string) => void;
    igrejaId: string;
    trimestreId: string;
    valorFinalMissao: number;
    valorFinalOferta: number;
    numeroMes: number;
    nomeMes: string;
}) {
    const [isEnviando, setIsEnviando] = useState(false);
    const { user } = useAuthContext();
    const methods = useForm<{
        confirmacao: boolean;
        valor_final_missao: number;
        valor_final_oferta: number;
        descricao_missao?: string;
        descricao_oferta?: string;
    }>();
    const {
        register,
        watch,
        setValue,
        handleSubmit,
        formState: { errors },
    } = methods;
    const { confirmacao, valor_final_missao, valor_final_oferta } = watch();

    const onSubmit = async (v: any) => {
        setIsEnviando(true);
        try {
            if (!v.confirmacao)
                throw new Error("Você precisa aceitar os termos de envio");
            await salvarRelatorioTrimestral({
                ...v,
                igrejaId,
                trimestreId,
                numeroMes,
            });
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
                        <h2>Enviar Relatório {nomeMes}?</h2>
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
                            <p>
                                <span>
                                    <strong>Atenção:</strong> O sistema calculou
                                    o total de <strong>{nomeMes}</strong> com
                                    base nos registros da chamada.
                                </span>

                                <span>
                                    Se houver diferença, informe o valor real e
                                    adicione o motivo abaixo.
                                </span>
                            </p>
                        </div>

                        <div
                            className={`confirmacao-modal__valor ${
                                valor_final_missao < valorFinalMissao
                                    ? "confirmacao-modal__valor--abaixo"
                                    : ""
                            } ${
                                valor_final_missao > valorFinalMissao
                                    ? "confirmacao-modal__valor--maior"
                                    : ""
                            }`}
                        >
                            <label htmlFor="confirmacao-valor-final">
                                Valor Final Missões
                            </label>
                            <input
                                type="number"
                                defaultValue={valorFinalMissao}
                                step={0.01}
                                id="confirmacao-valor-final"
                                placeholder="Valor final"
                                {...register("valor_final_missao", {
                                    required:
                                        "Você precisa digitar o valor final para salvar o relatório.",
                                    onBlur: (evt) => {
                                        const valor = Number(
                                            evt.target.value.replace(",", "."),
                                        );

                                        if (Number.isNaN(valor))
                                            setValue("valor_final_missao", 0);
                                        else
                                            setValue(
                                                "valor_final_missao",
                                                valor,
                                            );
                                    },
                                    valueAsNumber: true,
                                })}
                            />
                            {errors.valor_final_missao && (
                                <div className="confirmacao-modal__error">
                                    <p>{errors.valor_final_missao.message}</p>
                                </div>
                            )}
                        </div>
                        <AnimatePresence>
                            {(valor_final_missao < valorFinalMissao ||
                                valor_final_missao > valorFinalMissao) && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className={`confirmacao-modal__desc`}
                                    key={"confirmacao-descricao"}
                                >
                                    <label htmlFor="confirmacao-descricao">
                                        Justificativa Missões
                                    </label>
                                    <textarea
                                        id="confirmacao-descricao"
                                        {...register("descricao_missao", {
                                            required:
                                                !(
                                                    valor_final_missao <
                                                        valorFinalMissao ||
                                                    valor_final_missao >
                                                        valorFinalMissao
                                                ) ||
                                                "Você precisa adicionar uma justificativa para diferença do valor de missões.",
                                        })}
                                    ></textarea>

                                    {errors.descricao_missao && (
                                        <div className="confirmacao-modal__error">
                                            <p>
                                                {
                                                    errors.descricao_missao
                                                        .message
                                                }
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div
                            className={`confirmacao-modal__valor ${
                                valor_final_oferta < valorFinalOferta
                                    ? "confirmacao-modal__valor--abaixo"
                                    : ""
                            } ${
                                valor_final_oferta > valorFinalOferta
                                    ? "confirmacao-modal__valor--maior"
                                    : ""
                            }`}
                        >
                            <label htmlFor="confirmacao-valor-final">
                                Valor Final Ofertas
                            </label>
                            <input
                                type="number"
                                defaultValue={valorFinalOferta}
                                step={0.01}
                                id="confirmacao-valor-final"
                                placeholder="Valor final"
                                {...register("valor_final_oferta", {
                                    required:
                                        "Você precisa digitar o valor final para salvar o relatório.",
                                    onBlur: (evt) => {
                                        const valor = Number(
                                            evt.target.value.replace(",", "."),
                                        );

                                        if (Number.isNaN(valor))
                                            setValue("valor_final_oferta", 0);
                                        else
                                            setValue(
                                                "valor_final_oferta",
                                                valor,
                                            );
                                    },
                                    valueAsNumber: true,
                                })}
                            />
                            {errors.valor_final_oferta && (
                                <div className="confirmacao-modal__error">
                                    <p>{errors.valor_final_oferta.message}</p>
                                </div>
                            )}
                        </div>

                        <AnimatePresence>
                            {(valor_final_oferta < valorFinalOferta ||
                                valor_final_oferta > valorFinalOferta) && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className={`confirmacao-modal__desc`}
                                    key={"confirmacao-descricao"}
                                >
                                    <label htmlFor="confirmacao-descricao">
                                        Justificativa Ofertas
                                    </label>
                                    <textarea
                                        id="confirmacao-descricao"
                                        {...register("descricao_oferta", {
                                            required:
                                                !(
                                                    valor_final_oferta <
                                                        valorFinalOferta ||
                                                    valor_final_oferta >
                                                        valorFinalOferta
                                                ) ||
                                                "Você precisa adicionar uma justificativa para diferença do valor de ofertas.",
                                        })}
                                    ></textarea>

                                    {errors.descricao_oferta && (
                                        <div className="confirmacao-modal__error">
                                            <p>
                                                {
                                                    errors.descricao_oferta
                                                        .message
                                                }
                                            </p>
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
