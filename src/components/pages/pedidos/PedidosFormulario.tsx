import {
    AnimatePresence,
    motion,
    Reorder,
    useDragControls,
} from "framer-motion";
import {
    Controller,
    FormProvider,
    useController,
    useFieldArray,
    useForm,
    useFormContext,
    type Control,
    type FieldError,
} from "react-hook-form";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import "./pedidos-formulario.scss";
import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import Dropdown from "../../ui/Dropdown";
import {
    faBookOpen,
    faCaretDown,
    faCaretUp,
    faCirclePlus,
    faCloudArrowUp,
    faFloppyDisk,
    faGripLines,
    faMessage,
    faSquarePlus,
    faTrash,
    faTriangleExclamation,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    collection,
    doc,
    documentId,
    getDoc,
    getDocs,
    query,
    where,
} from "firebase/firestore";
import { db } from "../../../utils/firebase";
import { useAuthContext } from "../../../context/AuthContext";
import AlertModal from "../../ui/AlertModal";
import { getFunctions, httpsCallable } from "firebase/functions";
import Loading from "../../layout/loading/Loading";
import type {
    PedidosEstrutura,
    PedidosInterface,
    RevistaType,
    TextType,
} from "../../../interfaces/PedidosInterface";
import RevistaView from "./RevistaView";
import TextView from "./TextView";

interface FormEstrutura {
    titulo?: string;
    idKey?: string;
    campos: (RevistaType | TextType)[];
}
interface Form {
    titulo: string;
    descricao?: string;
    data_inicio: string;
    data_fim: string;
    tipo: "modelo" | "formulario";
    nomeModelo?: string;
    estrutura: FormEstrutura[];
}
type Type = "revista" | "text";

const functions = getFunctions();
const salvarFormularioPedido = httpsCallable(
    functions,
    "salvarFormularioPedido",
);

const revistaType = {
    tipo: "revista",
    titulo: "",
    tipoRevista: "",
    rotuloId: "",
    preco_unitario: 0,
    obrigatorio: false,
};
const textType = {
    tipo: "text",
    titulo: "",
    obrigatorio: false,
};

const newCampo = (type: Type) => {
    if (type === "revista")
        return {
            ...revistaType,
            idKey: crypto?.randomUUID ? crypto.randomUUID() : Date.now(),
        };
    if (type === "text")
        return {
            ...textType,
            idKey: crypto?.randomUUID ? crypto.randomUUID() : Date.now(),
        };
};

const ErrorForm = ({ field }: { field?: FieldError }) => {
    return (
        <AnimatePresence>
            {field && (
                <motion.div
                    className="pedidos-formulario__input-erro"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                >
                    <p>{field.message}</p>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const InputTitulo = () => {
    const { control, register } = useFormContext();
    const titulo = useController({
        control,
        name: "titulo",
        rules: {
            required: "O título é obrigatório",
        },
        defaultValue: "",
    });
    const dataInicio = useController({
        control,
        name: "data_inicio",
        rules: {
            required: "A data de início é obrigatória.",
        },
        defaultValue: "",
    });
    const dataFim = useController({
        control,
        name: "data_fim",
        rules: {
            required: "A data final é obrigatória",
        },
        defaultValue: "",
    });
    return (
        <div className="pedidos-formulario__secao">
            <div className="pedidos-formulario__input pedidos-formulario__input-titulo">
                <input
                    type="text"
                    id="nome-formulario"
                    className={titulo.fieldState.error ? "input-error" : ""}
                    {...titulo.field}
                    placeholder="Título"
                />

                <ErrorForm field={titulo.fieldState.error} />
            </div>

            <div className="pedidos-formulario__input pedidos-formulario__input-datas">
                <div className="pedidos-formulario__data">
                    <label htmlFor="data-inicio-form">Data Início</label>
                    <input
                        id="data-inicio-form"
                        type="date"
                        className={
                            dataInicio.fieldState.error ? "input-error" : ""
                        }
                        {...dataInicio.field}
                    />
                    <ErrorForm field={dataInicio.fieldState.error} />
                </div>
                <div className="pedidos-formulario__data">
                    <label htmlFor="data-fim-form">Data Final</label>
                    <input
                        type="date"
                        id="data-fim-form"
                        className={
                            dataFim.fieldState.error ? "input-error" : ""
                        }
                        {...dataFim.field}
                    />
                    <ErrorForm field={dataFim.fieldState.error} />
                </div>
            </div>

            <div className="pedidos-formulario__input pedidos-formulario__input-desc">
                <input
                    type="text"
                    id="desc-formulario"
                    {...register("descricao")}
                    placeholder="descrição"
                />
            </div>
        </div>
    );
};
const InputRevista = React.memo(
    ({ rotulos, isSelected, onDelete, secao, campo }: any) => {
        const { register, control } = useFormContext();
        const keyRegister = `estrutura.${secao}.campos.${campo}`;
        const tipoRevista = useController({
            control,
            name: `${keyRegister}.tipoRevista`,
            rules: { required: "É necessário escrever o tipo de revista" },
        });
        const precoUnitario = useController({
            control,
            name: `${keyRegister}.preco_unitario`,
            rules: {
                required: "É necessário incluir o preço da revista",
            },
        });

        const rotuloId = useController({
            control,
            name: `${keyRegister}.rotuloId`,
        });

        return (
            <>
                <div
                    className={`pedidos-formulario__revista ${isSelected ? "active" : "desactive"}`}
                >
                    <div className="pedidos-formulario__input">
                        <label>Rótulo</label>

                        <Controller
                            control={control}
                            name={`${keyRegister}.rotuloId`}
                            rules={{
                                required:
                                    "É necessário selecionar um rótulo para a revista",
                            }}
                            render={({ field, fieldState }) => (
                                <Dropdown
                                    lista={rotulos}
                                    current={
                                        rotulos.find(
                                            (v: any) => v.id === field?.value,
                                        )?.nome
                                    }
                                    selectId={field?.value}
                                    onSelect={(v: any) => field.onChange(v.id)}
                                    isAll={false}
                                    isErro={!!fieldState.error}
                                />
                            )}
                        />

                        <ErrorForm field={rotuloId.fieldState.error} />
                    </div>

                    <div className="pedidos-formulario__group">
                        <div className="pedidos-formulario__input">
                            <label htmlFor="tipo-revista">
                                Tipo de Revista
                            </label>
                            <input
                                type="text"
                                id="tipo-revista"
                                className={
                                    tipoRevista.fieldState.error
                                        ? "input-error"
                                        : ""
                                }
                                placeholder="Aluno, Professor, Visual, etc..."
                                {...tipoRevista.field}
                            />

                            <ErrorForm field={tipoRevista.fieldState.error} />
                        </div>
                        <div className="pedidos-formulario__input">
                            <label htmlFor="preco-revista">
                                Preço Unitário
                            </label>
                            <input
                                type="number"
                                id="preco-revista"
                                placeholder="R$"
                                step={0.01}
                                className={
                                    precoUnitario.fieldState.error
                                        ? "input-error"
                                        : ""
                                }
                                {...precoUnitario.field}
                                onBlur={(v) => {
                                    precoUnitario.field.onBlur();

                                    const value = v.target.value;
                                    const convert = Number(
                                        value.replace(",", "."),
                                    );

                                    if (Number.isNaN(convert))
                                        precoUnitario.field.onChange(0);
                                    else precoUnitario.field.onChange(convert);
                                }}
                            />

                            <ErrorForm field={precoUnitario.fieldState.error} />
                        </div>
                    </div>

                    <div className="pedidos-formulario__opcoes">
                        <div className="pedidos-formulario__input-obrigatorio">
                            <p>Obrigatório</p>
                            <label htmlFor="obrigatorio"></label>
                            <input
                                type="checkbox"
                                id="obrigatorio"
                                {...register(`${keyRegister}.obrigatorio`)}
                            />
                        </div>
                        <motion.button
                            type="button"
                            className="pedidos-formulario__deletar"
                            whileTap={{ scale: 0.9 }}
                            onTap={() => onDelete(campo)}
                        >
                            <span>
                                <FontAwesomeIcon icon={faTrash} />
                            </span>
                        </motion.button>
                    </div>
                </div>

                {!isSelected && (
                    <RevistaView
                        preco={precoUnitario.field.value}
                        rotulo={rotulos.find(
                            (v: any) => v.id === rotuloId.field.value,
                        )}
                        tipoRevista={tipoRevista.field.value}
                        onInvalid={
                            !!rotuloId.fieldState.error ||
                            !!tipoRevista.fieldState.error ||
                            !!precoUnitario.fieldState.error
                        }
                    />
                )}
            </>
        );
    },
);
const InputText = React.memo(
    ({
        isSelected,
        onDelete,
        secao,
        campo,
    }: {
        isSelected: boolean;
        onDelete: (i: number) => void;
        secao: number;
        campo: number;
    }) => {
        const { control, register } = useFormContext();
        const keyRegister = `estrutura.${secao}.campos.${campo}`;
        const { field, fieldState } = useController({
            name: `${keyRegister}.titulo`,
            control,
            rules: { required: "O título é obrigatório" },
        });

        const isErro = fieldState.error;
        return (
            <>
                <div
                    className={`pedidos-formulario__text ${isSelected ? "active" : "desactive"}`}
                >
                    <div className="pedidos-formulario__input">
                        <label htmlFor="titulo-text">Título</label>
                        <input
                            type="text"
                            id="titulo-text"
                            placeholder="titulo"
                            className={isErro ? "input-error" : ""}
                            {...field}
                        />

                        <ErrorForm field={isErro} />
                    </div>

                    <div className="pedidos-formulario__opcoes">
                        <div className="pedidos-formulario__input-obrigatorio">
                            <p>Obrigatório</p>
                            <label htmlFor="obrigatorio"></label>
                            <input
                                type="checkbox"
                                id="obrigatorio"
                                {...register(`${keyRegister}.obrigatorio`)}
                            />
                        </div>
                        <motion.button
                            type="button"
                            className="pedidos-formulario__deletar"
                            whileTap={{ scale: 0.9 }}
                            onTap={() => onDelete(campo)}
                        >
                            <span>
                                <FontAwesomeIcon icon={faTrash} />
                            </span>
                        </motion.button>
                    </div>
                </div>

                {!isSelected && (
                    <TextView onInvalid={!!isErro} titulo={field.value} />
                )}
            </>
        );
    },
);
const InputSecaoTitulo = ({ register, index }: any) => {
    return (
        <div className="pedidos-formulario__input pedidos-formulario__input-titulo-secao">
            <input
                type="text"
                id="secao-titulo"
                placeholder="Título Seção(opcional)"
                {...register(`estrutura.${index}.titulo`)}
            />
        </div>
    );
};
const CardDrag = ({
    value,
    onClick,
    children,
}: {
    value: any;
    onClick: () => void;
    children: ReactNode;
}) => {
    const controls = useDragControls();
    return (
        <Reorder.Item
            value={value}
            dragListener={false}
            dragControls={controls}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            {children}

            <motion.button
                type="button"
                onTapStart={onClick}
                className="pedidos-formulario__secao-drag"
                onPointerDown={(e) => controls.start(e)}
            >
                <FontAwesomeIcon icon={faGripLines} />
            </motion.button>
        </Reorder.Item>
    );
};
const InputSalvarModelo = React.memo(
    ({
        onClose,
        control,
        onSalvarModelo,
    }: {
        onClose: () => void;
        control: any;
        onSalvarModelo: () => void;
    }) => {
        const nomeModelo = useController({
            control,
            name: "nomeModelo",
            rules: { required: "O nome do modelo é obrigatório" },
        });
        return (
            <motion.div
                className="pedidos-formulario__salvar-modelo__overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="pedidos-formulario__salvar-modelo">
                    <div className="pedidos-formulario__salvar-modelo__header">
                        <h2>
                            <span>
                                <FontAwesomeIcon icon={faFloppyDisk} />
                            </span>
                            <span>Salvar como Modelo?</span>
                        </h2>

                        <button
                            className="pedidos-formulario__salvar-modelo__close"
                            title="fechar"
                            type="button"
                            onClick={onClose}
                        >
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>

                    <div className="pedidos-formulario__salvar-modelo__body">
                        <div className="pedidos-formulario__salvar-modelo__input">
                            <label htmlFor="titulo-modelo">
                                Nome do Modelo
                            </label>
                            <input
                                type="text"
                                id="titulo-modelo"
                                {...nomeModelo.field}
                            />

                            <ErrorForm field={nomeModelo.fieldState.error} />
                        </div>

                        <div className="pedidos-formulario__salvar-modelo__enviar">
                            <button type="button" onClick={onClose}>
                                Cancelar
                            </button>
                            <motion.button
                                type="submit"
                                disabled={!nomeModelo.field.value}
                                onTap={onSalvarModelo}
                            >
                                Salvar Modelo
                            </motion.button>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    },
);
const SecaoCampos = React.memo(
    ({
        rotulos,
        isCurrentSecao,
        secao,
        control,
        onCreate,
    }: {
        rotulos: RotulosClassesInterface[];
        isCurrentSecao: boolean;
        secao: number;
        control: Control<any>;
        onCreate: (fn: (type: Type) => void) => void;
    }) => {
        const [currentSelect, setCurrentSelect] = useState<number | null>(null);
        const addCurrentSelect = useCallback(
            (i: number | null) => () => {
                setCurrentSelect(i);
            },
            [],
        );
        const { remove, fields, append, replace } = useFieldArray({
            name: `estrutura.${secao}.campos`,
            control,
            keyName: "id",
        });
        const deletar = useCallback((i: number) => {
            remove(i);
        }, []);
        useEffect(() => {
            if (isCurrentSecao) {
                const criar = (type: Type) => {
                    append(newCampo(type));
                    setCurrentSelect((v) => (v === null ? 0 : v + 1));
                };
                onCreate(criar);
            }
        }, [isCurrentSecao]);
        return (
            <>
                <Reorder.Group values={fields} axis="y" onReorder={replace}>
                    {fields.map((v: any, i) => (
                        <CardDrag
                            key={v.idKey}
                            value={v}
                            onClick={addCurrentSelect(null)}
                        >
                            <div onClick={addCurrentSelect(i)}>
                                <>
                                    {v.tipo === "text" ? (
                                        <InputText
                                            isSelected={
                                                isCurrentSecao
                                                    ? currentSelect === i
                                                    : false
                                            }
                                            onDelete={deletar}
                                            secao={secao}
                                            campo={i}
                                        />
                                    ) : (
                                        <InputRevista
                                            rotulos={rotulos}
                                            isSelected={
                                                isCurrentSecao
                                                    ? currentSelect === i
                                                    : false
                                            }
                                            onDelete={deletar}
                                            secao={secao}
                                            campo={i}
                                        />
                                    )}
                                </>
                            </div>
                        </CardDrag>
                    ))}
                </Reorder.Group>
            </>
        );
    },
);
const SecaoItem = React.memo(
    ({
        isCurrentSecao,
        onClick,
        register,
        index,
        rotulos,
        control,
        criar,
        isLast,
        swapDown,
        swapUp,
        remove,
    }: {
        isCurrentSecao: boolean;
        onClick: (i: number) => void;
        register: any;
        index: number;
        rotulos: any[];
        control: any;
        isLast: boolean;
        criar: (fn: (type: Type) => void) => void;
        swapUp: (i: number) => void;
        swapDown: (i: number) => void;
        remove: (i: number) => void;
    }) => {
        return (
            <div
                className={`pedidos-formulario__secao pedidos-formulario__subsecao ${isCurrentSecao ? "active" : ""}`}
                onClick={() => onClick(index)}
            >
                <InputSecaoTitulo register={register} index={index} />

                <SecaoCampos
                    rotulos={rotulos}
                    isCurrentSecao={isCurrentSecao}
                    secao={index}
                    control={control}
                    onCreate={criar}
                />

                <div className="pedidos-formulario__deletar--div">
                    <motion.button
                        type="button"
                        className="pedidos-formulario__deletar"
                        whileTap={{ scale: 0.9 }}
                        onTap={() => remove(index)}
                    >
                        <span>
                            <FontAwesomeIcon icon={faTrash} />
                        </span>
                    </motion.button>
                </div>

                <div className="pedidos-formulario__swap-buttons">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        disabled={index === 0}
                        onTap={() => swapUp(index)}
                    >
                        <FontAwesomeIcon icon={faCaretUp} />
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        disabled={isLast}
                        onTap={() => swapDown(index)}
                    >
                        <FontAwesomeIcon icon={faCaretDown} />
                    </motion.button>
                </div>
            </div>
        );
    },
);
const BotaoAdicionar = ({
    onAdd,
}: {
    onAdd: (type: "secao" | "text" | "revista") => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const opcoes = [
        {
            icon: <FontAwesomeIcon icon={faSquarePlus} />,
            name: "Nova Seção",
            id: "secao",
        },
        {
            icon: <FontAwesomeIcon icon={faBookOpen} />,
            name: "Nova Revista",
            id: "revista",
        },
        {
            icon: <FontAwesomeIcon icon={faMessage} />,
            name: "Novo Texto",
            id: "text",
        },
    ];

    return (
        <div className="pedidos-formulario__adicionar">
            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        key={"add-opcs"}
                        className="pedidos-formulario__adicionar-opcs"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 10, opacity: 0 }}
                    >
                        {opcoes.map((v, i) => (
                            <motion.li key={i} onTap={() => onAdd(v.id as any)}>
                                <span>{v.icon}</span>
                                <p>{v.name}</p>
                            </motion.li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>

            <motion.button
                onTap={() => setIsOpen((v) => !v)}
                whileHover={{ scale: 0.9 }}
            >
                <FontAwesomeIcon icon={faCirclePlus} />
            </motion.button>
        </div>
    );
};

function PedidosFormulario() {
    const [rotulos, setRotulos] = useState<RotulosClassesInterface[]>([]);
    const [currentSecaoSelect, setCurrentSecaoSelect] = useState<number | null>(
        null,
    );
    const [isModelo, setIsModelo] = useState(false);
    const [salvarModelo, setSalvarModelo] = useState(false);
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
    const [isLoading, setIsLoading] = useState(true);

    const { modeloId } = useParams();
    const navigate = useNavigate();

    const methods = useForm<Form>({ defaultValues: { tipo: "formulario" } });
    const { handleSubmit, register, control, reset, setValue } = methods;
    const { append, fields, swap, remove } = useFieldArray({
        control,
        name: "estrutura",
        keyName: "idKey",
    });

    const criarRef = useRef<(type: Type) => void | null>(null);

    const criar = useCallback((fn: (type: Type) => void) => {
        criarRef.current = fn;
    }, []);
    const swapUp = useCallback((i: number) => {
        swap(i, i - 1);
    }, []);
    const swapDown = useCallback((i: number) => {
        swap(i, i + 1);
    }, []);
    const addCurrentSecao = useCallback((i: number) => {
        setCurrentSecaoSelect(i);
    }, []);
    const onCloseSalvarModelo = useCallback(() => {
        setValue("tipo", "formulario");
        setSalvarModelo(false);
    }, []);
    const onSalvarModelo = useCallback(() => setSalvarModelo(false), []);

    const { user, isSuperAdmin } = useAuthContext();

    const onSubmit = async (v: Form) => {
        setIsLoading(true);

        try {
            const { data } = await salvarFormularioPedido({
                modeloId,
                dados: v,
            });
            const resp = data as any;
            if (resp?.tipo === "modelo") navigate("/pedidos");
            else navigate(`/pedidos/formulario/${resp.id}?share=true`);
        } catch (error: any) {
            setMensagem({
                title: "Erro ao salvar",
                icon: <FontAwesomeIcon icon={faTriangleExclamation} />,
                cancelText: "Cancelar",
                confirmText: "Ok",
                message: error.message,
                onCancel: () => setMensagem(null),
                onClose: () => setMensagem(null),
                onConfirm: () => setMensagem(null),
            });

            setIsLoading(false);
        }
    };

    useEffect(() => {
        const getRotulos = async () => {
            const rotulosCll = collection(db, "rotulos_classes");
            const q = query(
                rotulosCll,
                where("ministerioId", "==", user?.ministerioId),
            );
            const rotulosDocs = await getDocs(q);

            if (rotulosDocs.empty) return setRotulos([]);

            const r = rotulosDocs.docs
                .map((v) => {
                    const data = {
                        id: v.id,
                        ...v.data(),
                    } as RotulosClassesInterface;
                    const name = data.nome;
                    const idadeMinima =
                        data.idade_minima !== null
                            ? `${data.idade_minima}`
                            : "";
                    const idadeMaxima =
                        data.idade_maxima !== null
                            ? `${data.idade_maxima}`
                            : "";
                    const nome = `${data?.nome}${idadeMinima || idadeMaxima ? ` (${idadeMinima} - ${idadeMaxima || "N/A"} anos)` : ""}`;

                    return { ...data, nome, name };
                })
                .sort((a, b) => {
                    if (a.nome === "OUTRO") return 1;
                    if (b.nome === "OUTRO") return -1;

                    return a.idade_minima - b.idade_minima;
                });

            setRotulos(r);
        };
        const getItem = async () => {
            setIsLoading(true);
            const pedidosCll = collection(db, "pedidos");
            const q = query(
                pedidosCll,
                where("ministerioId", "==", user?.ministerioId),
                where(documentId(), "==", modeloId),
            );
            const pedidosDocs = await getDocs(q);

            const msg = {
                title: "Não encontrado",
                icon: <FontAwesomeIcon icon={faTriangleExclamation} />,
                cancelText: "Cancelar",
                confirmText: "Ok",
                message: "Registro não encontrado",
                onCancel: () => setMensagem(null),
                onClose: () => setMensagem(null),
                onConfirm: () => setMensagem(null),
            };

            if (pedidosDocs.empty) {
                setMensagem(msg);
                return;
            }

            const pedidos = {
                id: pedidosDocs.docs[0].id,
                ...(pedidosDocs.docs[0].data() as PedidosInterface),
            };

            if (pedidos.tipo === "modelo") setIsModelo(true);

            const estruturaCll = doc(
                db,
                "pedidos",
                modeloId!,
                "estrutura",
                "dados",
            );
            const estruturaDocs = await getDoc(estruturaCll);

            if (!estruturaDocs.exists()) {
                setMensagem(msg);
                return;
            }

            const { estrutura } = estruturaDocs.data() as PedidosEstrutura;

            const dataInicio = pedidos.data_inicio
                .toDate()
                .toLocaleDateString("pt-BR")
                .split("/");
            const dataFim = pedidos.data_fim
                .toDate()
                .toLocaleDateString("pt-BR")
                .split("/");

            reset({
                ...pedidos,
                estrutura,
                data_inicio: `${dataInicio[2]}-${dataInicio[1]}-${dataInicio[0]}`,
                data_fim: `${dataFim[2]}-${dataFim[1]}-${dataFim[0]}`,
                tipo: "formulario",
            });
        };

        getRotulos().finally(() => setIsLoading(false));
        if (modeloId)
            getItem()
                .catch((v) => console.log(v))
                .finally(() => setIsLoading(false));
    }, []);
    if (!isSuperAdmin.current) return <Navigate to={"/pedidos"} />;
    if (isLoading) return <Loading />;
    return (
        <>
            <div className="pedidos-formulario">
                <FormProvider {...methods}>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <InputTitulo />

                        {fields.map((v, i) => {
                            const isCurrentSecao = currentSecaoSelect === i;
                            const isLast = fields.length === i + 1;

                            return (
                                <SecaoItem
                                    control={control}
                                    criar={criar}
                                    index={i}
                                    isCurrentSecao={isCurrentSecao}
                                    register={register}
                                    rotulos={rotulos}
                                    key={v.idKey}
                                    onClick={addCurrentSecao}
                                    isLast={isLast}
                                    swapUp={swapUp}
                                    swapDown={swapDown}
                                    remove={remove}
                                />
                            );
                        })}

                        {salvarModelo && (
                            <AnimatePresence>
                                <InputSalvarModelo
                                    control={control}
                                    onClose={onCloseSalvarModelo}
                                    onSalvarModelo={onSalvarModelo}
                                    key={"salvar-modelo-modal"}
                                />
                            </AnimatePresence>
                        )}

                        <div className="pedidos-formulario__submit">
                            {!isModelo && (
                                <motion.button
                                    type="button"
                                    whileTap={{ scale: 0.95 }}
                                    className="model"
                                    onTap={() => {
                                        setValue("tipo", "modelo");
                                        setSalvarModelo(true);
                                    }}
                                >
                                    <span>
                                        <FontAwesomeIcon icon={faFloppyDisk} />
                                    </span>
                                    <span>Salvar como Modelo</span>
                                </motion.button>
                            )}
                            <motion.button
                                type="submit"
                                className="submit"
                                whileTap={{ scale: 0.95 }}
                                onTapStart={() => {
                                    setValue("tipo", "formulario");
                                }}
                            >
                                <span>
                                    <FontAwesomeIcon icon={faCloudArrowUp} />
                                </span>
                                <span>Públicar Formulário</span>
                            </motion.button>
                        </div>
                    </form>
                </FormProvider>

                <BotaoAdicionar
                    onAdd={(type) => {
                        const model: any =
                            type === "revista"
                                ? newCampo("revista")
                                : type === "text"
                                  ? newCampo("text")
                                  : undefined;

                        if (fields.length === 0 || type === "secao") {
                            append({
                                titulo: "",
                                campos: model ? [model] : [],
                            });

                            setCurrentSecaoSelect(fields.length);
                        } else {
                            criarRef.current && criarRef.current(type);
                        }
                    }}
                />
            </div>

            <AlertModal isOpen={!!mensagem} {...mensagem!} />
        </>
    );
}

export default PedidosFormulario;
