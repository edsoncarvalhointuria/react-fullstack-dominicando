import { useEffect, useState } from "react";
import "./cadastro-classe-modal.scss";
import { motion } from "framer-motion";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { useDataContext } from "../../context/DataContext";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db, functions } from "../../utils/firebase";
import { faChalkboardUser, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Dropdown from "./Dropdown";
import { httpsCallable } from "firebase/functions";
import LoadingModal from "../layout/loading/LoadingModal";
import AlertModal from "./AlertModal";
import { useAuthContext } from "../../context/AuthContext";

interface Form {
    igrejaId: string;
    rotuloId: string;
    nome: string;
    idade_minima?: number;
    idade_maxima?: number;
}
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
        control,
        formState: { errors },
    } = methods;

    const idade_maxima = useWatch({ name: "idade_maxima", control });
    const idade_minima = useWatch({ name: "idade_minima", control });
    const [isEnviando, setIsEnviando] = useState(false);
    const [isLoadingRotulos, setIsLoadingRotulos] = useState(true);
    const [rotulos, setRotulos] = useState<RotulosClassesInterface[]>([]);
    const [mensagemErro, setMensagemErro] = useState("");

    const { user } = useAuthContext();

    const onSubmit = (dados: Form) => {
        dados.idade_minima = Number.isNaN(dados.idade_minima) ? undefined : dados.idade_minima;
        dados.idade_maxima = Number.isNaN(dados.idade_maxima) ? undefined : dados.idade_maxima;
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
        const getRotulos = async () => {
            const coll = collection(db, "rotulos_classes");
            const q = query(coll, where("ministerioId", "==", user?.ministerioId));
            const docs = await getDocs(q);

            const rotulos = docs.docs
                .map((v) => {
                    const r = {
                        id: v.id,
                        ...v.data(),
                    } as RotulosClassesInterface;
                    const comIdade = typeof r?.idade_minima === "number" || typeof r?.idade_maxima === "number";
                    const idadeMinima = `${r.idade_minima}`;
                    const idadeMaxima = ` - ${r.idade_maxima ? `${r.idade_maxima} anos` : "N/A anos"}`;

                    r.nome = `${r?.nome}${comIdade ? ` (${idadeMinima}${idadeMaxima})` : ""}`;
                    return r;
                })
                .sort((a, b) => {
                    if (a.nome === "OUTRO") return 1;
                    if (b.nome === "OUTRO") return -1;

                    return a.idade_minima - b.idade_minima;
                });

            return rotulos.length > 0 ? rotulos : [{ id: "id-outro", nome: "OUTRO" } as any];
        };
        if (classeId)
            getClasse(classeId)
                .then((v) => {
                    reset({
                        nome: v?.nome,
                        idade_maxima: v?.idade_maxima,
                        idade_minima: v?.idade_minima,
                        igrejaId: v?.igrejaId,
                        rotuloId: v?.rotuloId,
                    });
                })
                .catch((err) => {
                    console.log("deu esse erro", err);
                    onCancel();
                });
        else if (igrejas.find((v) => v.id === igrejaId)) {
            setValue("igrejaId", igrejaId || "");
        }

        getRotulos()
            .then((v) => {
                setRotulos(v);
            })
            .catch((err) => {
                console.log("deu esse erro", err);
            })
            .finally(() => setIsLoadingRotulos(false));
    }, [classeId, igrejaId]);

    return (
        <>
            <motion.div
                className="classe-modal-overlay"
                onClick={onCancel}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
            >
                <motion.div
                    className="classe-modal"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <LoadingModal isEnviando={isEnviando} />
                    <div className="classe-modal__header">
                        <h2>
                            <FontAwesomeIcon icon={faChalkboardUser} />
                            {classeId ? "Editar Classe" : "Cadastrar Nova Classe"}
                        </h2>
                        <button className="classe-modal__close-btn" onClick={onCancel} title="Fechar">
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>

                    <FormProvider {...methods}>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <div className="classe-modal__body">
                                <div className={`classe-modal__input-group ${errors.rotuloId && "input-error"}`}>
                                    <label htmlFor="igreja-classe">
                                        Rótulo <span>*</span>
                                    </label>
                                    <Controller
                                        name="rotuloId"
                                        control={control}
                                        rules={{
                                            required: "O rótulo é obrigatório.",
                                        }}
                                        render={({ field }) => (
                                            <Dropdown
                                                lista={rotulos}
                                                current={rotulos.find((v) => field.value === v.id)?.nome || ""}
                                                isAll={false}
                                                isErro={!!errors.rotuloId}
                                                isLoading={isLoadingRotulos}
                                                selectId={field.value}
                                                onSelect={(response) => {
                                                    field.onChange(response?.id || null);
                                                    setValue("idade_minima", response?.idade_minima);
                                                    setValue("idade_maxima", response?.idade_maxima);
                                                }}
                                            />
                                        )}
                                    />
                                    {errors.rotuloId && (
                                        <p className="classe-modal__input-erro">{errors.rotuloId.message}</p>
                                    )}
                                </div>

                                <div className={`classe-modal__input-group ${errors.igrejaId && "input-error"}`}>
                                    <label htmlFor="igreja-classe">
                                        Igreja <span>*</span>
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
                                                current={igrejas.find((v) => v.id === field.value)?.nome || null}
                                                isAll={false}
                                                isErro={!!errors.igrejaId}
                                                onSelect={(response) => field.onChange(response?.id || null)}
                                            />
                                        )}
                                    />
                                    {errors.igrejaId && (
                                        <p className="classe-modal__input-erro">{errors.igrejaId.message}</p>
                                    )}
                                </div>

                                <div className="classe-modal__input-group">
                                    <label htmlFor="nome-classe">
                                        Nome da Classe <span>*</span>
                                    </label>
                                    <input
                                        className={errors.nome && "input-error"}
                                        id="nome-classe"
                                        type="text"
                                        {...register("nome", {
                                            required: "O nome da classe é obrigatório.",
                                            minLength: {
                                                value: 3,
                                                message: "O nome deve ter pelo menos 3 caracteres.",
                                            },
                                        })}
                                    />
                                    {errors.nome && <p className="classe-modal__input-erro">{errors.nome.message}</p>}
                                </div>

                                <div className="classe-modal__inputs">
                                    <div className="classe-modal__input-group">
                                        <label htmlFor="idade-minima-classe">
                                            Idade Mínima {idade_maxima ? <span> *</span> : <i>(não obrigatório)</i>}
                                        </label>
                                        <input
                                            className={errors.idade_minima && "input-error"}
                                            id="idade-minima-classe"
                                            type="number"
                                            {...register("idade_minima", {
                                                min: {
                                                    value: 0,
                                                    message: "Idade mínima inválida",
                                                },
                                                valueAsNumber: true,
                                                required: idade_maxima ? "Idade mínima é obrigatória" : false,
                                            })}
                                        />
                                        {errors.idade_minima && (
                                            <p className="classe-modal__input-erro">{errors.idade_minima.message}</p>
                                        )}
                                    </div>

                                    <div className="classe-modal__input-group">
                                        <label htmlFor="idade-maxima-classe">
                                            Idade Máxima {!idade_maxima ? <i>(não obrigatório)</i> : <></>}
                                        </label>
                                        <input
                                            className={errors.idade_maxima && "input-error"}
                                            id="idade-maxima-classe"
                                            type="number"
                                            {...register("idade_maxima", {
                                                min: {
                                                    value: idade_minima || 0,
                                                    message: "Idade máxima inválida",
                                                },
                                                valueAsNumber: true,
                                            })}
                                        />
                                        {errors.idade_maxima && (
                                            <p className="classe-modal__input-erro">{errors.idade_maxima.message}</p>
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
                                <button type="submit" className="button-primary" disabled={isEnviando}>
                                    {classeId ? "Salvar Alterações" : "Criar Classe"}
                                </button>
                            </div>
                        </form>
                    </FormProvider>
                </motion.div>
            </motion.div>

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
