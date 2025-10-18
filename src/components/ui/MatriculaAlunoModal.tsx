import {
    faBookOpen,
    faChurch,
    faIdCard,
    faSchool,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import "./matricula-aluno-modal.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FormProvider, useForm } from "react-hook-form";
import type { AlunoInterface } from "../../interfaces/AlunoInterface";
import type { LicaoInterface } from "../../interfaces/LicaoInterface";
import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import LoadingModal from "../layout/loading/LoadingModal";
import AlertModal from "./AlertModal";
import { db } from "../../utils/firebase";
import { getDoc, doc } from "firebase/firestore";
import { getIdade } from "../../utils/getIdade";

interface Form {
    data_matricula: string;
    possui_revista: boolean;
}

const variantsForm: Variants = {
    initial: {},
    animate: { transition: { delayChildren: stagger(0.1) } },
};
const variantsItem: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
};

const functions = getFunctions();
const salvarMatricula = httpsCallable(functions, "salvarMatricula");

function MatriculaAlunoModal({
    licao,
    onSave,
    onClose,
    aluno = undefined,
    alunoId = undefined,
    revista = undefined,
    data_matricula = undefined,
}: {
    aluno?: AlunoInterface;
    alunoId?: string;
    revista?: boolean;
    data_matricula?: string;
    licao: LicaoInterface;
    onSave: (aluno: any) => void;
    onClose: () => void;
}) {
    const [isEnviando, setIsEnviando] = useState(false);
    const [alunoState, setAlunoState] = useState<AlunoInterface | undefined>(
        aluno
    );
    const [mensagemErro, setMensagemErro] = useState("");
    const methods = useForm<Form>({
        defaultValues: {
            data_matricula:
                data_matricula ||
                new Date(new Date().setHours(0, 0, 0, 0))
                    .toISOString()
                    .split("T")[0],
            possui_revista: revista,
        },
    });

    const { register, handleSubmit } = methods;
    const onSubmit = (dados: Form) => {
        setIsEnviando(true);
        const envio = { dados, licaoId: licao.id, alunoId: alunoState!.id };
        salvarMatricula(envio)
            .then(({ data }) => {
                onSave(data);
                onClose();
            })
            .catch((err) => {
                console.log("deu esse erro", err);
                setMensagemErro(err.message);
            })
            .finally(() => setIsEnviando(false));
    };

    useEffect(() => {
        const getAluno = async () => {
            const alunoDoc = doc(db, "alunos", alunoId!);
            const alunoSnap = await getDoc(alunoDoc);

            if (!alunoSnap.exists()) onClose();

            setAlunoState({
                id: alunoSnap.id,
                ...alunoSnap.data(),
            } as AlunoInterface);
        };

        if (alunoId) getAluno();
    }, [alunoId]);
    return (
        <>
            <motion.div
                className="matricula-aluno__overlay"
                onClick={onClose}
                exit={{
                    opacity: 0,
                    transition: { duration: 0.2 },
                }}
            >
                <motion.div
                    className="matricula-aluno"
                    variants={variantsForm}
                    initial={"initial"}
                    animate={"animate"}
                    onClick={(e) => e.stopPropagation()}
                >
                    <LoadingModal isEnviando={isEnviando} />
                    <motion.div
                        className="matricula-aluno__header"
                        variants={variantsItem}
                    >
                        <div className="matricula-aluno__title">
                            <span>
                                <FontAwesomeIcon icon={faIdCard} />
                            </span>
                            <h2>Confirmação Matricula</h2>
                        </div>
                        <div
                            className="matricula-aluno__close"
                            onClick={() => onClose()}
                        >
                            <FontAwesomeIcon icon={faXmark} />
                        </div>
                    </motion.div>

                    <div className="matricula-aluno__body">
                        <FormProvider {...methods}>
                            <form
                                className="matricula-aluno__form"
                                onSubmit={handleSubmit(onSubmit)}
                            >
                                <motion.div
                                    className="matricula-aluno__form-infos"
                                    variants={variantsItem}
                                >
                                    <div className="matricula-aluno__form-igreja">
                                        <div className="matricula-aluno__form-igreja--igreja">
                                            <p className="matricula-aluno__form-label">
                                                <span>
                                                    <FontAwesomeIcon
                                                        icon={faChurch}
                                                    />
                                                </span>
                                                Igreja
                                            </p>
                                            <p>{licao.igrejaNome}</p>
                                        </div>
                                        <div className="matricula-aluno__form-igreja--classe">
                                            <p className="matricula-aluno__form-label">
                                                <span>
                                                    <FontAwesomeIcon
                                                        icon={faSchool}
                                                    />
                                                </span>
                                                Classe
                                            </p>
                                            <p>{licao.classeNome}</p>
                                        </div>
                                        <div className="matricula-aluno__form-igreja--licao">
                                            <p className="matricula-aluno__form-label">
                                                <span>
                                                    <FontAwesomeIcon
                                                        icon={faBookOpen}
                                                    />
                                                </span>
                                                Lição
                                            </p>
                                            <p>{licao.titulo}</p>
                                        </div>
                                    </div>

                                    <div className="matricula-aluno__form-aluno">
                                        <h3>Dados do Aluno</h3>
                                        <div className="matricula-aluno__form-container">
                                            <div className="matricula-aluno__form-aluno--nome">
                                                <p className="matricula-aluno__form-label">
                                                    Nome
                                                </p>

                                                <p>
                                                    {alunoState?.nome_completo}
                                                </p>
                                            </div>
                                            <div className="matricula-aluno__form-aluno--nascimento">
                                                <p className="matricula-aluno__form-label">
                                                    Data de Nascimento
                                                </p>
                                                <p>
                                                    {alunoState?.data_nascimento
                                                        .toDate()
                                                        .toLocaleDateString(
                                                            "pt-BR"
                                                        )}
                                                </p>
                                            </div>

                                            <div className="matricula-aluno__form-aluno--contato">
                                                <p className="matricula-aluno__form-label">
                                                    Idade
                                                </p>
                                                <p>
                                                    {alunoState &&
                                                        getIdade(
                                                            alunoState.data_nascimento
                                                        )}{" "}
                                                    anos
                                                </p>
                                            </div>

                                            <div className="matricula-aluno__form-aluno--contato">
                                                <p className="matricula-aluno__form-label">
                                                    Contato
                                                </p>
                                                <p>
                                                    {alunoState?.contato ||
                                                        "Sem contato"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="matricula-aluno__form-matricula">
                                        <div className="matricula-aluno__form-input">
                                            <label htmlFor="matricula-aluno-data-input">
                                                Data Matricula
                                            </label>
                                            <input
                                                type="date"
                                                id="matricula-aluno-data-input"
                                                {...register("data_matricula")}
                                            />
                                        </div>

                                        <div className="matricula-aluno__form-input">
                                            <label>Possui Lição</label>
                                            <label htmlFor="matricula-aluno-checkbox-input">
                                                Possui Lição?
                                            </label>
                                            <input
                                                type="checkbox"
                                                id="matricula-aluno-checkbox-input"
                                                {...register("possui_revista")}
                                            />
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div
                                    className="matricula-aluno__form-buttons"
                                    variants={variantsItem}
                                >
                                    <div className="matricula-aluno__form-cancelar">
                                        <button
                                            title="Cancelar"
                                            type="button"
                                            onClick={() => onClose()}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                    <div className="matricula-aluno__form-enviar">
                                        <button
                                            title="Matricular Aluno"
                                            disabled={!alunoState}
                                            type="submit"
                                        >
                                            Matricular Aluno
                                        </button>
                                    </div>
                                </motion.div>
                            </form>
                        </FormProvider>
                    </div>
                </motion.div>
            </motion.div>

            <AnimatePresence>
                <AlertModal
                    key={"erro-salvar-matricula"}
                    isOpen={!!mensagemErro}
                    message={mensagemErro}
                    onCancel={onClose}
                    onClose={onClose}
                    onConfirm={onClose}
                    title="Erro ao realizar matricula"
                    cancelText="Sair"
                    confirmText="Ok"
                />
            </AnimatePresence>
        </>
    );
}

export default MatriculaAlunoModal;
