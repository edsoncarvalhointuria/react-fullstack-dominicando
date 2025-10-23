import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faChevronDown,
    faImage,
    faSquarePen,
    faTrash,
    faTriangleExclamation,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useState, type ReactNode } from "react";
import "./novo-trimestre-modal.scss";
import { FormProvider, useForm, type FieldError } from "react-hook-form";
import AlertModal from "./AlertModal";
import LoadingModal from "../layout/loading/LoadingModal";
import { useAuthContext } from "../../context/AuthContext";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../../utils/firebase";
import type { LicaoPreparoInterface } from "../../interfaces/LicaoPreparoInterface";
import { reduzirImagem } from "../../utils/reduzirImagem";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";

interface NovoTrimestreAulasForm {
    titulo: string;
    numero_aulas: number;
    data_inicio: string;
    img?: FileList | string;
    trimestre: number;
}

const functions = getFunctions();
const salvarLicaoAulaPreparo = httpsCallable(
    functions,
    "salvarLicaoAulaPreparo"
);
const deletarLicaoAulaPreparo = httpsCallable(
    functions,
    "deletarLicaoAulaPreparo"
);

function NovoTrimestreAulasModal({
    onClose,
    onSave,
    licaoPreparoRef = null,
}: {
    onClose: () => void;
    onSave: () => void;
    licaoPreparoRef?: LicaoPreparoInterface | null;
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [dataAulas, setDataAulas] = useState<string[][]>([]);
    const [isEnviando, setIsEnviando] = useState(false);
    const [mensagem, setMensagem] = useState<{
        message: string | ReactNode;
        title: string;
        confirmText: string;
        cancelText: string;
        onCancel: () => void;
        onClose: () => void;
        onConfirm: () => void;
        icon?: any;
    } | null>(null);

    const { user } = useAuthContext();

    const methods = useForm<NovoTrimestreAulasForm>({
        defaultValues: {
            numero_aulas: 13,
            trimestre: 1,
        },
    });
    const {
        register,
        watch,
        setValue,
        handleSubmit,
        reset,
        formState: { errors },
    } = methods;

    const { isSuperAdmin } = useAuthContext();
    const { data_inicio, numero_aulas, img } = watch();

    const apagarLicao = async (licaoId: string) => {
        try {
            setIsEnviando(true);
            setMensagem(null);
            await deletarLicaoAulaPreparo({ licaoPreparoId: licaoId });
            window.location.reload();
        } catch (error: any) {
            console.log("deu esse erro", error);
            setMensagem({
                title: "Erro ao deletar lição",
                message: error.message,
                onClose: () => setMensagem(null),
                onConfirm: () => setMensagem(null),
                onCancel: () => setMensagem(null),
                cancelText: "Cancelar",
                confirmText: "Ok",
                icon: <FontAwesomeIcon icon={faTriangleExclamation} />,
            });
        } finally {
            setIsEnviando(false);
        }
    };

    const onSubmit = async (dados: NovoTrimestreAulasForm) => {
        setIsEnviando(true);
        if (dados.img?.length) {
            const imageRef = await reduzirImagem(
                (dados.img as FileList)[0],
                800,
                800
            );
            const storage = getStorage();
            const caminho = `capas-licoes-preparo/${Date.now()}-${
                imageRef.name
            }`;
            const storageRef = ref(storage, caminho);
            const imageSnap = await uploadBytes(storageRef, imageRef);
            const link = await getDownloadURL(imageSnap.ref);

            dados.img = link;
        } else if (licaoPreparoRef) dados.img = licaoPreparoRef.img;
        else dados.img = undefined;

        try {
            await salvarLicaoAulaPreparo({
                dados,
                licaoPreparoId: licaoPreparoRef?.id || null,
            });
            onSave();
            onClose();
        } catch (Error: any) {
            console.log("deu esse erro", Error);
            setMensagem({
                cancelText: "Cancelar",
                confirmText: "Ok",
                message: Error.message,
                onCancel: onClose,
                onClose: onClose,
                onConfirm: onClose,
                title: "Erro ao salvar",
                icon: <FontAwesomeIcon icon={faTriangleExclamation} />,
            });
        } finally {
            setIsEnviando(false);
        }
    };
    const ErroComponent = (field: FieldError | undefined) => {
        return (
            <AnimatePresence>
                {field && (
                    <motion.div
                        key={field.message}
                        className="novo-trimestre__input--erro"
                    >
                        {field.message}
                    </motion.div>
                )}
            </AnimatePresence>
        );
    };

    if (!isSuperAdmin.current) onClose();
    useEffect(() => {
        if (data_inicio && numero_aulas > 0) {
            const data = new Date(data_inicio + "T12:00:00");

            if (data.getUTCDay() !== 0) return setDataAulas([]);

            const listaDatas: string[][] = Array.from({
                length: numero_aulas,
            }).map((_, i) => {
                const dataAula = new Date(data);
                dataAula.setUTCDate(dataAula.getUTCDate() + i * 7);
                return [
                    "Aula " + (i + 1),
                    dataAula.toLocaleDateString("pt-BR"),
                ];
            });

            setDataAulas(listaDatas);
        }
    }, [data_inicio, numero_aulas]);
    useEffect(() => {
        const getLicaoPreparo = async () => {
            setIsLoading(true);
            const licaoColl = collection(db, "licoes_preparo");
            const q = query(
                licaoColl,
                where("ministerioId", "==", user?.ministerioId),
                where("ativo", "==", true),
                limit(1)
            );

            const licaoSnap = await getDocs(q);

            if (licaoSnap.empty) return;

            const licao = {
                id: licaoSnap.docs[0].id,
                ...licaoSnap.docs[0].data(),
            } as LicaoPreparoInterface;

            return licao;
        };

        if (licaoPreparoRef) {
            reset({
                data_inicio: licaoPreparoRef.data_inicio
                    .toDate()
                    .toISOString()
                    .split("T")[0],
                img: undefined,
                numero_aulas: licaoPreparoRef.numero_aulas,
                titulo: licaoPreparoRef.titulo,
                trimestre: licaoPreparoRef.trimestre,
            });
        } else
            getLicaoPreparo()
                .then((v) => {
                    if (v) {
                        const data = v.data_final.toDate();
                        data.setDate(data.getDate() + 7);
                        setValue(
                            "trimestre",
                            v.trimestre + 1 === 5 ? 1 : v.trimestre + 1
                        );
                        setValue(
                            "data_inicio",
                            data.toISOString().split("T")[0]
                        );
                    }
                })
                .finally(() => setIsLoading(false));
    }, []);
    return (
        <>
            <motion.div
                className="novo-trimestre"
                style={{ minHeight: "auto" }}
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
            >
                {isLoading ? (
                    <img
                        className="novo-trimestre__loading"
                        src="/loading.gif"
                        alt="Carregando..."
                    />
                ) : (
                    <>
                        <LoadingModal isEnviando={isEnviando} />
                        <div className="novo-trimestre__header">
                            <div className="novo-trimestre__header--title-group">
                                <div className="novo-trimestre__header--title">
                                    {licaoPreparoRef ? (
                                        <h2>{licaoPreparoRef.titulo}</h2>
                                    ) : (
                                        <h2>
                                            Preencha os dados das novas aulas
                                        </h2>
                                    )}
                                </div>
                            </div>

                            <div
                                className="novo-trimestre__header--close"
                                onClick={() => onClose()}
                            >
                                <FontAwesomeIcon icon={faXmark} />
                            </div>

                            {licaoPreparoRef ? (
                                <div className="novo-trimestre__header--aviso">
                                    <FontAwesomeIcon icon={faSquarePen} />
                                    <span>Atenção: você está editando</span>
                                </div>
                            ) : (
                                <></>
                            )}
                        </div>
                        <div className="novo-trimestre__body">
                            <FormProvider {...methods}>
                                <form
                                    onSubmit={handleSubmit(onSubmit)}
                                    className="novo-trimestre__form"
                                >
                                    <div className="novo-trimestre__input novo-trimestre__input--file">
                                        <label htmlFor="imagem_capa">
                                            <FontAwesomeIcon icon={faImage} />
                                            <span>
                                                {img && img.length > 0
                                                    ? (img as FileList)[0].name
                                                    : "Adicionar capa da revista"}
                                            </span>
                                        </label>
                                        <input
                                            type="file"
                                            id="imagem_capa"
                                            accept="image/*"
                                            {...register("img")}
                                        />
                                    </div>
                                    <div className="novo-trimestre__input-group">
                                        <div className="novo-trimestre__input">
                                            <label htmlFor="titulo">
                                                Titulo da lição
                                            </label>
                                            <input
                                                type="text"
                                                id="titulo"
                                                className={
                                                    errors.titulo
                                                        ? "input-error"
                                                        : ""
                                                }
                                                {...register("titulo", {
                                                    required:
                                                        "O título da lição é obrigatório",
                                                })}
                                            />
                                            {ErroComponent(errors.titulo)}
                                        </div>

                                        <div className="novo-trimestre__input">
                                            <label htmlFor="novo-trimestre-trimestre">
                                                Nº do Trimestre
                                            </label>
                                            <input
                                                type="number"
                                                step={1}
                                                id="novo-trimestre-trimestre"
                                                className={
                                                    errors.trimestre
                                                        ? "input-error"
                                                        : ""
                                                }
                                                {...register("trimestre", {
                                                    required:
                                                        "O Nº do trimestre é obrigatório.",
                                                    min: {
                                                        value: 1,
                                                        message:
                                                            "Número do trimestre está inválido",
                                                    },
                                                    max: {
                                                        value: 4,
                                                        message:
                                                            "Número do trimestre está inválido",
                                                    },
                                                    valueAsNumber: true,
                                                })}
                                            />
                                            {ErroComponent(errors.trimestre)}
                                        </div>
                                    </div>

                                    <div className="novo-trimestre__input-group">
                                        <div className="novo-trimestre__input">
                                            <label htmlFor="data_inicio">
                                                Data de Início
                                            </label>
                                            <input
                                                type="date"
                                                id="data_inicio"
                                                className={
                                                    errors.data_inicio
                                                        ? "input-error"
                                                        : ""
                                                }
                                                {...register("data_inicio", {
                                                    required:
                                                        "A data de início é obrigatória.",
                                                    validate: (value) => {
                                                        if (!value) return true;
                                                        const dia = new Date(
                                                            value
                                                        ).getUTCDay();
                                                        return (
                                                            dia === 0 ||
                                                            "A data de início precisa ser um domingo!"
                                                        );
                                                    },
                                                })}
                                            />
                                            {ErroComponent(errors.data_inicio)}
                                        </div>
                                        <div className="novo-trimestre__input">
                                            <label htmlFor="numero_aulas">
                                                Quantidade de Aulas
                                            </label>
                                            <input
                                                type="number"
                                                id="numero_aulas"
                                                className={
                                                    errors.numero_aulas
                                                        ? "input-error"
                                                        : ""
                                                }
                                                {...register("numero_aulas", {
                                                    required:
                                                        "A quantidade de aulas é obrigatória",
                                                    valueAsNumber: true,
                                                    min: {
                                                        value: 1,
                                                        message:
                                                            "O valor mínimo é 1",
                                                    },
                                                })}
                                            />
                                            {ErroComponent(errors.numero_aulas)}
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {dataAulas.length && (
                                            <motion.div
                                                initial={{
                                                    opacity: 0,
                                                    scale: 0,
                                                }}
                                                animate={{
                                                    opacity: 1,
                                                    scale: 1,
                                                }}
                                                exit={{ opacity: 0, scale: 0 }}
                                                onTap={() =>
                                                    setIsOpen((v) => !v)
                                                }
                                                className={`novo-trimestre__previsao-aulas ${
                                                    isOpen ? "is-open" : ""
                                                }`}
                                                key={"previsao-aulas"}
                                            >
                                                <h3>
                                                    Lista de aulas{" "}
                                                    <span>
                                                        <FontAwesomeIcon
                                                            icon={faChevronDown}
                                                        />
                                                    </span>
                                                </h3>
                                                <AnimatePresence>
                                                    {isOpen && (
                                                        <motion.ul
                                                            key={
                                                                "previsao-aulas-container"
                                                            }
                                                            initial={{
                                                                y: -10,
                                                                height: 0,
                                                            }}
                                                            animate={{
                                                                y: 0,
                                                                height: "auto",
                                                            }}
                                                            exit={{
                                                                y: -10,
                                                                height: 0,
                                                            }}
                                                            className="novo-trimestre__previsao-aulas--lista"
                                                        >
                                                            {dataAulas.map(
                                                                ([
                                                                    aula,
                                                                    data,
                                                                ]) => (
                                                                    <motion.li
                                                                        key={
                                                                            aula +
                                                                            data
                                                                        }
                                                                    >
                                                                        <p>
                                                                            {
                                                                                aula
                                                                            }
                                                                        </p>
                                                                        <data
                                                                            value={
                                                                                data
                                                                            }
                                                                        >
                                                                            {
                                                                                data
                                                                            }
                                                                        </data>
                                                                    </motion.li>
                                                                )
                                                            )}
                                                        </motion.ul>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div
                                        className={`novo-trimestre__actions ${
                                            licaoPreparoRef &&
                                            "novo-trimestre__actions--edit"
                                        }`}
                                    >
                                        {licaoPreparoRef && (
                                            <button
                                                type="button"
                                                className="button-delete"
                                                onClick={() => {
                                                    setMensagem({
                                                        title: "Deletar lição",
                                                        message: (
                                                            <>
                                                                <span>
                                                                    Tem certeza
                                                                    que deseja
                                                                    deletar a
                                                                    lição:{" "}
                                                                    <strong>
                                                                        {
                                                                            licaoPreparoRef?.titulo
                                                                        }
                                                                    </strong>
                                                                    ?
                                                                </span>
                                                                <span>
                                                                    Isso irá
                                                                    apagar{" "}
                                                                    <strong>
                                                                        TODOS
                                                                    </strong>{" "}
                                                                    os dados
                                                                    associados a
                                                                    ela.
                                                                </span>
                                                            </>
                                                        ),
                                                        onClose: () => {
                                                            setMensagem(null);
                                                            onClose();
                                                        },
                                                        onConfirm: () =>
                                                            apagarLicao(
                                                                licaoPreparoRef!
                                                                    .id
                                                            ),
                                                        onCancel: () => {
                                                            setMensagem(null);
                                                            onClose();
                                                        },
                                                        cancelText: "Cancelar",
                                                        confirmText:
                                                            "Sim, deletar lição",
                                                        icon: (
                                                            <FontAwesomeIcon
                                                                icon={faTrash}
                                                            />
                                                        ),
                                                    });
                                                }}
                                            >
                                                Deletar
                                            </button>
                                        )}
                                        <div className="novo-trimestre__actions-btn">
                                            <button
                                                type="button"
                                                className="button-secondary"
                                                onClick={() => onClose()}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                className="button-primary"
                                            >
                                                {licaoPreparoRef
                                                    ? "Salvar"
                                                    : "Criar Trimestre"}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </FormProvider>
                        </div>
                    </>
                )}

                <div
                    className="novo-trimestre-close"
                    onClick={() => (!isEnviando ? onClose() : null)}
                ></div>
            </motion.div>

            <AlertModal
                key={"mensagem-alert-modal-novo-trimestre"}
                isOpen={!!mensagem}
                {...mensagem!}
            />
        </>
    );
}

export default NovoTrimestreAulasModal;
