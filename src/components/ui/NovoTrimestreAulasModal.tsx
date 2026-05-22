import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faImage,
    faTrash,
    faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useState, type ReactNode } from "react";
import {
    FormProvider,
    useForm,
    useWatch,
    type FieldError,
} from "react-hook-form";
import AlertModal from "./AlertModal";
import { useAuthContext } from "../../context/AuthContext";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../../utils/firebase";
import type { LicaoPreparoInterface } from "../../interfaces/LicaoPreparoInterface";
import { reduzirImagem } from "../../utils/reduzirImagem";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import NovoTrimestreTemplate, { ListaDeAulas } from "./NovoTrimestreTemplate";

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
    "salvarLicaoAulaPreparo",
);
const deletarLicaoAulaPreparo = httpsCallable(
    functions,
    "deletarLicaoAulaPreparo",
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
        control,
        setValue,
        handleSubmit,
        reset,
        formState: { errors },
    } = methods;
    const img = useWatch({ control, name: "img" });

    const { isSuperAdmin } = useAuthContext();

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
                800,
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
        const getLicaoPreparo = async () => {
            setIsLoading(true);
            const licaoColl = collection(db, "licoes_preparo");
            const q = query(
                licaoColl,
                where("ministerioId", "==", user?.ministerioId),
                where("ativo", "==", true),
                limit(1),
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
                            v.trimestre + 1 === 5 ? 1 : v.trimestre + 1,
                        );
                        setValue(
                            "data_inicio",
                            data.toISOString().split("T")[0],
                        );
                    }
                })
                .finally(() => setIsLoading(false));
    }, []);
    return (
        <>
            <NovoTrimestreTemplate
                isEdit={!!licaoPreparoRef}
                isEnviando={isEnviando}
                isLoading={isLoading}
                title={
                    licaoPreparoRef
                        ? licaoPreparoRef.titulo
                        : "Preencha os dados das novas aulas"
                }
            >
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
                                <label htmlFor="titulo">Titulo da lição</label>
                                <input
                                    type="text"
                                    id="titulo"
                                    className={
                                        errors.titulo ? "input-error" : ""
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
                                        errors.trimestre ? "input-error" : ""
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
                                        errors.data_inicio ? "input-error" : ""
                                    }
                                    {...register("data_inicio", {
                                        required:
                                            "A data de início é obrigatória.",
                                        validate: (value) => {
                                            if (!value) return true;
                                            const dia = new Date(
                                                value,
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
                                        errors.numero_aulas ? "input-error" : ""
                                    }
                                    {...register("numero_aulas", {
                                        required:
                                            "A quantidade de aulas é obrigatória",
                                        valueAsNumber: true,
                                        min: {
                                            value: 1,
                                            message: "O valor mínimo é 1",
                                        },
                                    })}
                                />
                                {ErroComponent(errors.numero_aulas)}
                            </div>
                        </div>

                        <ListaDeAulas
                            control={control}
                            nameAulas="numero_aulas"
                            nameData="data_inicio"
                        />

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
                                                        Tem certeza que deseja
                                                        deletar a lição:{" "}
                                                        <strong>
                                                            {
                                                                licaoPreparoRef?.titulo
                                                            }
                                                        </strong>
                                                        ?
                                                    </span>
                                                    <span>
                                                        Isso irá apagar{" "}
                                                        <strong>TODOS</strong>{" "}
                                                        os dados associados a
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
                                                    licaoPreparoRef!.id,
                                                ),
                                            onCancel: () => {
                                                setMensagem(null);
                                                onClose();
                                            },
                                            cancelText: "Cancelar",
                                            confirmText: "Sim, deletar lição",
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
            </NovoTrimestreTemplate>
            <AlertModal
                key={"mensagem-alert-modal-novo-trimestre"}
                isOpen={!!mensagem}
                {...mensagem!}
            />
        </>
    );
}

export default NovoTrimestreAulasModal;
