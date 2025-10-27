import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./importar-csv-modal.scss";
import {
    faCircleExclamation,
    faDownload,
    faFileCirclePlus,
    faFileCsv,
    faThumbsUp,
    faTriangleExclamation,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { motion, type Variants } from "framer-motion";
import { useState, type ReactNode } from "react";
import AlertModal from "./AlertModal";
import Papa from "papaparse";
import Dropdown from "./Dropdown";
import { useDataContext } from "../../context/DataContext";
import LoadingModal from "../layout/loading/LoadingModal";
import { useAuthContext } from "../../context/AuthContext";

const variantsContainer: Variants = {
    hidden: {},
    visible: {},
    exit: {},
};

const variantsModal: Variants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
        scale: 1,
        opacity: 1,
        transition: { type: "spring", damping: 25, stiffness: 200 },
    },
    exit: { scale: 0.9, opacity: 0 },
};

interface CSVForm {
    csv: FileList;
    igrejaId?: string;
}

interface ModalCsvProps {
    onCancel: () => void;
    onSave: () => void;
    listaColunas: string[];
    firebaseFunction: (value: any) => Promise<{ data: any }>;
    igreja?: boolean;
}

function downloadModelo(listaColunas: string[]) {
    const colunas = listaColunas.join(";");
    const colunasBlob = new Blob([colunas], {
        type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(colunasBlob);
    const a = document.createElement("a");
    a.download = "CSV-MODELO.csv";
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

function ImportarCSVModal({
    onCancel,
    listaColunas,
    firebaseFunction,
    onSave,
    igreja = false,
}: ModalCsvProps) {
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
    const { isSecretario } = useAuthContext();
    const { igrejas } = useDataContext();

    const methods = useForm<CSVForm>();
    const {
        handleSubmit,
        register,
        watch,
        control,
        formState: { errors },
    } = methods;
    const arquivo = watch("csv");

    const onSubmit = async (v: CSVForm) => {
        setIsEnviando(true);
        const file = v.csv[0] as any;

        if (!file) {
            console.log("Arquivo vazio");
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => {
                const texto = header.match(/(.+)\(.+\)/);

                if (texto?.[0] && texto[1]) return texto[1];

                return header.trim();
            },
            complete: (resultados) => {
                const csv = resultados.data;
                const igrejaId = v.igrejaId;

                firebaseFunction({ csv, igrejaId })
                    .then(({ data }) => {
                        const save = () => {
                            onSave();
                            onCancel();
                        };
                        setMensagem({
                            cancelText: "Cancelar",
                            confirmText: "Ok",
                            message: data.message,
                            onCancel: save,
                            onClose: save,
                            onConfirm: save,
                            title: "Sucesso!",
                            icon: <FontAwesomeIcon icon={faThumbsUp} />,
                        });
                    })
                    .catch((error) =>
                        setMensagem({
                            title: "Erro ao converter arquivo",
                            message: error.message,
                            onClose: onCancel,
                            onConfirm: onCancel,
                            onCancel: onCancel,
                            cancelText: "Cancelar",
                            confirmText: "Ok",
                            icon: (
                                <FontAwesomeIcon icon={faTriangleExclamation} />
                            ),
                        })
                    )
                    .finally(() => setIsEnviando(false));
            },
            error: (error) => {
                setIsEnviando(false);
                setMensagem({
                    title: "Erro ao converter arquivo",
                    message: error.message,
                    onClose: onCancel,
                    onConfirm: onCancel,
                    onCancel: onCancel,
                    cancelText: "Cancelar",
                    confirmText: "Ok",
                    icon: <FontAwesomeIcon icon={faTriangleExclamation} />,
                });
            },
        });
    };

    if (isSecretario.current) onCancel();
    return (
        <>
            <motion.div
                className="importar-csv-overlay"
                onClick={() => onCancel()}
                variants={variantsContainer}
                initial={"hidden"}
                animate={"visible"}
                exit={"exit"}
            >
                <motion.div
                    className="importar-csv"
                    variants={variantsModal}
                    onClick={(v) => v.stopPropagation()}
                >
                    <LoadingModal isEnviando={isEnviando} />
                    <div className="importar-csv__header">
                        <div className="importar-csv__title">
                            <span>
                                <FontAwesomeIcon icon={faFileCsv} />
                            </span>
                            <h2>Importar CSV</h2>
                        </div>

                        <button
                            className="importar-csv__close"
                            onClick={() => onCancel()}
                        >
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>

                    <div className="importar-csv__body">
                        <div className="importar-csv__modelo">
                            <div className="importar-csv__modelo--aviso">
                                <p>
                                    <span>
                                        <FontAwesomeIcon
                                            icon={faCircleExclamation}
                                        />
                                    </span>
                                    Atenção: os nomes das colunas não podem ser
                                    alterados.
                                </p>
                            </div>
                            <motion.button
                                className="importar-csv__modelo--download"
                                title="BAIXAR MODELO CSV"
                                onTap={() => downloadModelo(listaColunas)}
                            >
                                <span>
                                    <FontAwesomeIcon icon={faDownload} />
                                </span>
                                Clique aqui para baixar o modelo CSV
                            </motion.button>
                        </div>

                        <FormProvider {...methods}>
                            <form
                                className="importar-csv__form"
                                onSubmit={handleSubmit(onSubmit)}
                            >
                                {igreja && (
                                    <div className="importar-csv__input importar-csv__input--igreja">
                                        <p>Igreja:</p>
                                        <Controller
                                            control={control}
                                            name="igrejaId"
                                            rules={{
                                                required:
                                                    "A igreja é obrigatória",
                                            }}
                                            render={({ field }) => (
                                                <Dropdown
                                                    lista={igrejas}
                                                    current={
                                                        igrejas.find(
                                                            (v) =>
                                                                v.id ===
                                                                field.value
                                                        )?.nome || null
                                                    }
                                                    onSelect={(v) =>
                                                        field.onChange(v?.id)
                                                    }
                                                    isAll={false}
                                                    isErro={!!errors.igrejaId}
                                                    selectId={field.value}
                                                />
                                            )}
                                        />
                                        {errors.igrejaId && (
                                            <div className="importar-csv__input--error">
                                                <p>{errors.igrejaId.message}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="importar-csv__input">
                                    <label htmlFor="importar-csv-file">
                                        <span>
                                            <FontAwesomeIcon
                                                icon={faFileCirclePlus}
                                            />
                                        </span>
                                        {arquivo && arquivo[0]
                                            ? arquivo[0].name
                                            : "Clique aqui para adicionar o CSV"}
                                    </label>
                                    <input
                                        type="file"
                                        id="importar-csv-file"
                                        accept=".csv"
                                        {...register("csv", {
                                            required:
                                                "É necessário anexar o arquivo.",
                                            validate: (v: any) => {
                                                return (
                                                    v[0]?.type?.includes(
                                                        "csv"
                                                    ) ||
                                                    "O arquivo precisa ser um CSV"
                                                );
                                            },
                                        })}
                                    />
                                    {errors.csv && (
                                        <div className="importar-csv__input--error">
                                            <p>{errors.csv.message}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="importar-csv__buttons">
                                    <button type="submit" title="ENVIAR CSV">
                                        Enviar
                                    </button>
                                </div>
                            </form>
                        </FormProvider>
                    </div>
                </motion.div>
            </motion.div>

            <AlertModal isOpen={!!mensagem} {...mensagem!} />
        </>
    );
}

export default ImportarCSVModal;
