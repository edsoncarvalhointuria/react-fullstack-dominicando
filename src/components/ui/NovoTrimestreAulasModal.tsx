import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage, faTrash, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useState, type ReactNode } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import AlertModal from "./AlertModal";
import { useAuthContext } from "../../context/AuthContext";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db, functions } from "../../utils/firebase";
import type { LicaoPreparoInterface } from "../../interfaces/LicaoPreparoInterface";
import { reduzirImagem } from "../../utils/reduzirImagem";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import NovoTrimestreTemplate, { ListaDeAulas, NovoTrimestreBaseInputs } from "./NovoTrimestreTemplate";
import "./novo-trimestre-modal.scss";
import getTrimestre from "../../utils/getTrimestre";

interface NovoTrimestreAulasForm {
    titulo: string;
    numero_aulas: number;
    data_inicio: string;
    img?: FileList | string;
    trimestre: number;
}

const salvarLicaoAulaPreparo = httpsCallable(functions, "salvarLicaoAulaPreparo");
const deletarLicaoAulaPreparo = httpsCallable(functions, "deletarLicaoAulaPreparo");

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
    const { register, control, setValue, handleSubmit } = methods;
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
            const imageRef = await reduzirImagem((dados.img as FileList)[0], 800, 800);
            const storage = getStorage();
            const caminho = `capas-licoes-preparo/${Date.now()}-${imageRef.name}`;
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
            const obj: Partial<NovoTrimestreAulasForm> = {
                data_inicio: licaoPreparoRef.data_inicio.toDate().toISOString().split("T")[0],
                img: undefined,
                numero_aulas: licaoPreparoRef.numero_aulas,
                titulo: licaoPreparoRef.titulo,
                trimestre: licaoPreparoRef.trimestre,
            };
            Object.entries(obj).forEach(([key, value]) => setValue(key as any, value));
        } else
            getLicaoPreparo()
                .then((v) => {
                    if (v) {
                        const data = v.data_final.toDate();
                        data.setDate(data.getDate() + 7);
                        setValue("trimestre", v.trimestre + 1 === 5 ? 1 : v.trimestre + 1);
                        setValue("data_inicio", data.toISOString().split("T")[0]);
                    } else {
                        const hoje = new Date();
                        const trimestre = getTrimestre(hoje);
                        const inicioTrimestre = new Date(hoje.getFullYear(), (trimestre - 1) * 3, 1);
                        const diaSemana = inicioTrimestre.getDay();
                        const domingo = (7 - diaSemana) % 7;
                        inicioTrimestre.setDate(inicioTrimestre.getDate() + domingo);

                        setValue("trimestre", trimestre);
                        setValue("data_inicio", inicioTrimestre.toISOString().split("T")[0]);
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
                title={licaoPreparoRef ? licaoPreparoRef.titulo : "Preencha os dados das novas aulas"}
            >
                <FormProvider {...methods}>
                    <form onSubmit={handleSubmit(onSubmit)} className="novo-trimestre__form">
                        <div className="novo-trimestre__input novo-trimestre__input--file">
                            <label htmlFor="imagem_capa">
                                <FontAwesomeIcon icon={faImage} />
                                <span>
                                    {img && img.length > 0 ? (img as FileList)[0].name : "Adicionar capa da revista"}
                                </span>
                            </label>
                            <input type="file" id="imagem_capa" accept="image/*" {...register("img")} />
                        </div>

                        <NovoTrimestreBaseInputs />

                        <ListaDeAulas control={control} nameAulas="numero_aulas" nameData="data_inicio" />

                        <div
                            className={`novo-trimestre__actions ${licaoPreparoRef && "novo-trimestre__actions--edit"}`}
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
                                                        Tem certeza que deseja deletar a lição:{" "}
                                                        <strong>{licaoPreparoRef?.titulo}</strong>?
                                                    </span>
                                                    <span>
                                                        Isso irá apagar <strong>TODOS</strong> os dados associados a
                                                        ela.
                                                    </span>
                                                </>
                                            ),
                                            onClose: () => {
                                                setMensagem(null);
                                                onClose();
                                            },
                                            onConfirm: () => apagarLicao(licaoPreparoRef!.id),
                                            onCancel: () => {
                                                setMensagem(null);
                                                onClose();
                                            },
                                            cancelText: "Cancelar",
                                            confirmText: "Sim, deletar lição",
                                            icon: <FontAwesomeIcon icon={faTrash} />,
                                        });
                                    }}
                                >
                                    Deletar
                                </button>
                            )}
                            <div className="novo-trimestre__actions-btn">
                                <button type="button" className="button-secondary" onClick={() => onClose()}>
                                    Cancelar
                                </button>
                                <button type="submit" className="button-primary">
                                    {licaoPreparoRef ? "Salvar" : "Criar Trimestre"}
                                </button>
                            </div>
                        </div>
                    </form>
                </FormProvider>
            </NovoTrimestreTemplate>
            <AlertModal key={"mensagem-alert-modal-novo-trimestre"} isOpen={!!mensagem} {...mensagem!} />
        </>
    );
}

export default NovoTrimestreAulasModal;
