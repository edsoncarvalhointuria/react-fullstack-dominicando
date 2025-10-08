import {
    faChevronDown,
    faDownload,
    faExclamationTriangle,
    faFileZipper,
    faImage,
} from "@fortawesome/free-solid-svg-icons";
import "./comprovastes.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAuthContext } from "../../../context/AuthContext";
import {
    Controller,
    FormProvider,
    useForm,
    type FieldError,
} from "react-hook-form";
import { useEffect, useState, type ReactNode } from "react";
import { useDataContext } from "../../../context/DataContext";
import Dropdown from "../../ui/Dropdown";
import { AnimatePresence, motion } from "framer-motion";
import type { LicaoInterface } from "../../../interfaces/LicaoInterface";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
} from "firebase/firestore";
import { db } from "../../../utils/firebase";
import type { AulaInterface } from "../../../interfaces/AulaInterface";
import type { RegistroAulaInterface } from "../../../interfaces/RegistroAulaInterface";
import useIsMobile from "../../../hooks/useIsMobile";
import { getFunctions, httpsCallable } from "firebase/functions";
import AlertModal from "../../ui/AlertModal";
import Loading from "../../layout/loading/Loading";

interface Form {
    igrejaId: string;
    classeId: string;
    licaoId: string;
    aula: number | undefined;
}

const baixarImagem = (url: any) => {
    try {
        const a = document.createElement("a");
        a.href = url;
        a.download = "comprovante.jpg";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (Error) {
        console.log("deu esse erro", Error);
    }
};

const baixarZip = async (nome: string, base64: any) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const arquivo = new Uint8Array(byteNumbers);

    const blob = new Blob([arquivo], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const ErroComponent = ({ Erro }: { Erro: FieldError | undefined }) => {
    return (
        <AnimatePresence>
            {Erro?.message && (
                <div
                    key={"erro-componente"}
                    className="comprovantes-pix__input-erro"
                >
                    {Erro.message}
                </div>
            )}
        </AnimatePresence>
    );
};

const Acordeao = ({ tipo, total, comprovantes, onBaixarZip }: any) => {
    const [isOpen, setIsOpen] = useState(true);
    const [loading, setLoading] = useState(true);
    const isMobile = useIsMobile(500);

    return (
        <div className="comprovantes-pix__acordeao">
            <div
                className="comprovantes-pix__acordeao-header"
                onClick={() => {
                    setIsOpen(!isOpen);
                    setLoading(true);
                }}
            >
                <div className="acordeao-header__titulo-container">
                    <div className="acordeao-header__titulo">
                        <motion.span animate={{ rotate: isOpen ? 0 : -90 }}>
                            <FontAwesomeIcon icon={faChevronDown} />
                        </motion.span>
                        <h3>{tipo}</h3>
                    </div>
                    {isMobile && (
                        <p className="total-valor">
                            {total.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                        </p>
                    )}
                </div>
                <div className="acordeao-header__info">
                    {!isMobile && (
                        <p className="total-valor">
                            {total.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                        </p>
                    )}
                    <button
                        disabled={!comprovantes}
                        className="baixar-zip-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onBaixarZip(tipo);
                        }}
                    >
                        <FontAwesomeIcon icon={faFileZipper} />
                        Baixar Todos (.zip)
                    </button>
                </div>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key={"acordeao-drop"}
                        className="comprovantes-pix__acordeao-body"
                        initial={{ height: 0, opacity: 0, padding: 0 }}
                        animate={{
                            height: "auto",
                            opacity: 1,
                            padding: "2rem",
                        }}
                        exit={{ height: 0, opacity: 0, padding: 0 }}
                    >
                        <div className="comprovantes-pix__grid-imagens">
                            {comprovantes ? (
                                comprovantes.map((v: string, i: number) => (
                                    <div
                                        key={i}
                                        className={`comprovantes-pix__imagem-card ${
                                            loading ? "carregando-imagem" : ""
                                        }`}
                                        onClick={() => baixarImagem(v)}
                                    >
                                        <img
                                            src={v}
                                            onLoad={() => setLoading(false)}
                                            alt={`Comprovante ${i + 1}`}
                                        />
                                        <div className="imagem-card__overlay">
                                            <button title="Baixar Imagem">
                                                <FontAwesomeIcon
                                                    icon={faDownload}
                                                />
                                            </button>
                                            {/* <button title="Ver Imagem">
                                                <FontAwesomeIcon
                                                    icon={faSearch}
                                                />
                                            </button> */}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="comprovantes-pix__grid-vazio">
                                    <p>Nenhum comprovante anexado.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const functions = getFunctions();
const baixarTodosComprovantes = httpsCallable(
    functions,
    "baixarTodosComprovantes"
);

function Comprovantes() {
    const [licoes, setLicoes] = useState<(LicaoInterface & { nome: string })[]>(
        []
    );
    const [currentLicao, setCurrentLicao] = useState<LicaoInterface | null>(
        null
    );
    const [aulas, setAulas] = useState<{ nome: any; id: any }[]>([]);
    const [registroAula, setRegistroAula] =
        useState<RegistroAulaInterface | null>(null);
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
    const [isLoadingLicoes, setIsLoadingLicoes] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { isSuperAdmin, isSecretario, user } = useAuthContext();
    const { igrejas, classes } = useDataContext();

    const methods = useForm<Form>();
    const {
        setValue,
        control,
        watch,
        handleSubmit,
        formState: { errors },
    } = methods;
    const { igrejaId, classeId } = watch();

    const onSubmit = async (dados: Form) => {
        const aulaDoc = doc(db, `licoes/${dados.licaoId}/aulas/${dados.aula}`);
        const aulaSnap = await getDoc(aulaDoc);

        if (!aulaSnap.exists()) return;

        const aula = aulaSnap.data() as AulaInterface;

        if (!aula.realizada) {
            setRegistroAula(null);
            return setMensagem({
                title: "Aula não realizada",
                message: "Essa aula ainda não foi realizada.",
                confirmText: "Ok",
                cancelText: "Cancelar",
                onCancel: () => setMensagem(null),
                onClose: () => setMensagem(null),
                onConfirm: () => setMensagem(null),
            });
        }
        const registroDoc = await getDoc(aula.registroRef);

        setRegistroAula({
            id: registroDoc.id,
            ...(registroDoc.data() as any),
        } as RegistroAulaInterface);
    };

    useEffect(() => {
        if (currentLicao)
            setAulas(
                Array.from({ length: currentLicao.numero_aulas }).map(
                    (_, i) => ({ nome: i + 1, id: i + 1 })
                )
            );
    }, [currentLicao]);
    useEffect(() => {
        const getLicoes = async (classeId: string) => {
            setIsLoadingLicoes(true);
            const licaoColl = collection(db, "licoes");
            const q = query(
                licaoColl,
                where("classeId", "==", classeId),
                isSuperAdmin.current
                    ? where("ministerioId", "==", user?.ministerioId)
                    : where("igrejaId", "==", user?.igrejaId)
            );
            const licoesSnap = await getDocs(q);

            if (licoesSnap.empty) return [];

            return licoesSnap.docs
                .map(
                    (v) =>
                        ({
                            id: v.id,
                            nome: `${v.data().titulo} - ${
                                v.data()?.numero_trimestre || 1
                            }º Trimestre de ${v
                                .data()
                                ?.data_inicio?.toDate()
                                ?.getFullYear()}`,
                            ...v.data(),
                        } as LicaoInterface & { nome: string })
                )
                .sort((a) => (a.ativo ? 1 : 0));
        };

        if (classeId)
            getLicoes(classeId)
                .then((v) => setLicoes(v))
                .catch((error) => console.log("deu esse erro", error))
                .finally(() => setIsLoadingLicoes(false));
    }, [classeId]);
    useEffect(() => {
        if (user) {
            if (!isSuperAdmin.current) setValue("igrejaId", user.igrejaId!);
            if (isSecretario.current) setValue("classeId", user?.classeId!);
        }
    }, [user]);

    if (isLoading) return <Loading />;
    return (
        <>
            <div className="comprovantes-pix">
                <div className="comprovantes-pix__header">
                    <div className="comprovantes-pix__title">
                        <span>
                            <FontAwesomeIcon icon={faImage} />
                        </span>
                        <h2>Comprovantes Pix</h2>
                    </div>

                    <div className="comprovantes-pix__filtros">
                        <FormProvider {...methods}>
                            <form
                                className="comprovantes-pix__form"
                                onSubmit={handleSubmit(onSubmit)}
                            >
                                <div className="comprovantes-pix__inputs">
                                    {!isSecretario.current && (
                                        <>
                                            <div className="comprovantes-pix__input-container">
                                                <div className="comprovantes-pix__input">
                                                    <p>Igreja</p>
                                                    <Controller
                                                        control={control}
                                                        name="igrejaId"
                                                        rules={{
                                                            required:
                                                                "É necessário escolher uma igreja",
                                                        }}
                                                        render={({ field }) => (
                                                            <Dropdown
                                                                current={
                                                                    igrejas.find(
                                                                        (v) =>
                                                                            v.id ===
                                                                            field.value
                                                                    )?.nome ||
                                                                    null
                                                                }
                                                                lista={igrejas}
                                                                isAll={false}
                                                                selectId={
                                                                    field.value
                                                                }
                                                                onSelect={(
                                                                    v
                                                                ) => {
                                                                    field.onChange(
                                                                        v?.id
                                                                    );
                                                                    setValue(
                                                                        "classeId",
                                                                        ""
                                                                    );
                                                                    setValue(
                                                                        "licaoId",
                                                                        ""
                                                                    );
                                                                    setValue(
                                                                        "aula",
                                                                        undefined
                                                                    );
                                                                }}
                                                                isErro={
                                                                    !!errors.igrejaId
                                                                }
                                                            />
                                                        )}
                                                    />
                                                </div>
                                                <ErroComponent
                                                    Erro={errors.igrejaId}
                                                />
                                            </div>

                                            <div className="comprovantes-pix__input-container">
                                                <div className="comprovantes-pix__input">
                                                    <p>Classe</p>
                                                    <Controller
                                                        control={control}
                                                        name="classeId"
                                                        rules={{
                                                            required:
                                                                "É necessário escolher uma classe",
                                                        }}
                                                        render={({ field }) => (
                                                            <Dropdown
                                                                current={
                                                                    classes.find(
                                                                        (v) =>
                                                                            v.id ===
                                                                            field.value
                                                                    )?.nome ||
                                                                    null
                                                                }
                                                                lista={classes.filter(
                                                                    (v) =>
                                                                        v.igrejaId ===
                                                                        igrejaId
                                                                )}
                                                                isAll={false}
                                                                selectId={
                                                                    field.value
                                                                }
                                                                onSelect={(
                                                                    v
                                                                ) => {
                                                                    field.onChange(
                                                                        v?.id
                                                                    );
                                                                    setValue(
                                                                        "licaoId",
                                                                        ""
                                                                    );
                                                                    setValue(
                                                                        "aula",
                                                                        undefined
                                                                    );
                                                                }}
                                                                isErro={
                                                                    !!errors.classeId
                                                                }
                                                            />
                                                        )}
                                                    />
                                                </div>
                                                <ErroComponent
                                                    Erro={errors.classeId}
                                                />
                                            </div>
                                        </>
                                    )}
                                    <div className="comprovantes-pix__input-container">
                                        <div className="comprovantes-pix__input">
                                            <p>Lição</p>
                                            <Controller
                                                control={control}
                                                name="licaoId"
                                                rules={{
                                                    required:
                                                        "É necessário escolher uma lição",
                                                }}
                                                render={({ field }) => (
                                                    <Dropdown
                                                        current={
                                                            licoes.find(
                                                                (v) =>
                                                                    v.id ===
                                                                    field.value
                                                            )?.titulo || null
                                                        }
                                                        lista={licoes}
                                                        isAll={false}
                                                        selectId={field.value}
                                                        onSelect={(v) => {
                                                            setCurrentLicao(v);
                                                            field.onChange(
                                                                v?.id
                                                            );
                                                            setValue(
                                                                "aula",
                                                                undefined
                                                            );
                                                        }}
                                                        isErro={
                                                            !!errors.licaoId
                                                        }
                                                        isLoading={
                                                            isLoadingLicoes
                                                        }
                                                    />
                                                )}
                                            />
                                        </div>
                                        <ErroComponent Erro={errors.licaoId} />
                                    </div>

                                    <div className="comprovantes-pix__input-container">
                                        <div className="comprovantes-pix__input">
                                            <p>Aula</p>
                                            <Controller
                                                control={control}
                                                name="aula"
                                                rules={{
                                                    required:
                                                        "É necessário selecionar a aula",
                                                }}
                                                render={({ field }) => (
                                                    <Dropdown
                                                        current={
                                                            aulas.find(
                                                                (v) =>
                                                                    v.id ===
                                                                    field.value
                                                            )?.nome || null
                                                        }
                                                        lista={aulas}
                                                        isAll={false}
                                                        selectId={
                                                            field.value as any
                                                        }
                                                        onSelect={(v) => {
                                                            field.onChange(
                                                                v?.id
                                                            );
                                                        }}
                                                        isErro={!!errors.aula}
                                                    />
                                                )}
                                            />
                                        </div>
                                        <ErroComponent Erro={errors.aula} />
                                    </div>
                                </div>

                                <div className="comprovantes-pix__buttons">
                                    <button
                                        type="submit"
                                        title="Buscar Comprovantes"
                                    >
                                        Buscar Comprovantes
                                    </button>
                                </div>
                            </form>
                        </FormProvider>
                    </div>
                </div>

                <div>
                    {registroAula && (
                        <motion.div
                            className="comprovantes-pix__body"
                            key={"comprovantes-pix__aviso"}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="comprovantes-pix__aviso">
                                <FontAwesomeIcon icon={faExclamationTriangle} />
                                <p>
                                    Atenção: Todos os comprovantes são deletados
                                    automaticamente <strong>90 dias</strong>{" "}
                                    após serem anexados.
                                </p>
                            </div>
                            <Acordeao
                                tipo={"Ofertas"}
                                total={registroAula.ofertas.pix}
                                comprovantes={registroAula?.imgsPixOfertas}
                                onBaixarZip={(tipo: string) => {
                                    setIsLoading(true);
                                    baixarTodosComprovantes({
                                        igrejaId,
                                        dados:
                                            registroAula?.imgsPixOfertas || [],
                                    })
                                        .then(({ data }) => {
                                            const { file } = data as any;
                                            baixarZip(
                                                `${tipo} - ${registroAula.id}`,
                                                file
                                            );
                                        })
                                        .catch((Error: any) =>
                                            setMensagem({
                                                title: "Erro ao baixar",
                                                message: Error.message,
                                                confirmText: "Ok",
                                                cancelText: "Cancelar",
                                                onCancel: () =>
                                                    setMensagem(null),
                                                onClose: () =>
                                                    setMensagem(null),
                                                onConfirm: () =>
                                                    setMensagem(null),
                                            })
                                        )
                                        .finally(() => setIsLoading(false));
                                }}
                            />
                            <Acordeao
                                tipo={"Missões"}
                                total={registroAula.missoes.pix}
                                comprovantes={registroAula?.imgsPixMissoes}
                                onBaixarZip={(tipo: string) => {
                                    setIsLoading(true);
                                    baixarTodosComprovantes({
                                        igrejaId,
                                        dados:
                                            registroAula?.imgsPixMissoes || [],
                                    })
                                        .then(({ data }) => {
                                            const { file } = data as any;
                                            baixarZip(
                                                `${tipo} - ${registroAula.id}`,
                                                file
                                            );
                                        })
                                        .catch((Error: any) =>
                                            setMensagem({
                                                title: "Erro ao baixar",
                                                message: Error.message,
                                                confirmText: "Ok",
                                                cancelText: "Cancelar",
                                                onCancel: () =>
                                                    setMensagem(null),
                                                onClose: () =>
                                                    setMensagem(null),
                                                onConfirm: () =>
                                                    setMensagem(null),
                                            })
                                        )
                                        .finally(() => setIsLoading(false));
                                }}
                            />
                        </motion.div>
                    )}
                </div>
            </div>

            <AlertModal isOpen={!!mensagem} {...mensagem!} />
        </>
    );
}

export default Comprovantes;
