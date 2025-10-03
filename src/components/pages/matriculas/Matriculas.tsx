import { AnimatePresence, motion } from "framer-motion";
import "./matriculas.scss";
import { useDataContext } from "../../../context/DataContext";
import Loading from "../../layout/loading/Loading";
import { useAuthContext } from "../../../context/AuthContext";
import {
    faAddressCard,
    faBookOpenReader,
    faFeather,
    faPlus,
    faThumbsUp,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Dropdown from "../../ui/Dropdown";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LicaoInterface } from "../../../interfaces/LicaoInterface";
import SearchInput from "../../ui/SearchInput";
import type { MatriculasInterface } from "../../../interfaces/MatriculasInterface";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../utils/firebase";
import MatriculaModal from "../../ui/MatriculaModal";
import MatriculaAlunoModal from "../../ui/MatriculaAlunoModal";
import AlertModal from "../../ui/AlertModal";
import { getFunctions, httpsCallable } from "firebase/functions";
import TabelaDeGestao from "../../ui/TabelaDeGestao";
import OrderInput from "../../ui/OrderInput";
import { getOrdem } from "../../../utils/getOrdem";

interface Form {
    igreja: string;
    classe: string;
    licao: string;
}

const functions = getFunctions();
const deletarMatricula = httpsCallable(functions, "deletarMatricula");

function Matriculas() {
    const OPTIONS = [
        {
            nome: "Nome Aluno",
            id: "alunoNome",
            icon: faFeather,
            isFilter: true,
            placeholder: "",
        },
        {
            nome: "Matricula",
            id: "data_matricula",
            icon: faAddressCard,
            isFilter: true,
            placeholder: "",
            dataObject: {},
        },
        {
            nome: "Possui Revista?",
            id: "possui_revista",
            icon: faBookOpenReader,
            isFilter: false,
            placeholder: "",
            isBoolean: true,
        },
    ];
    const [licoes, setLicoes] = useState<(LicaoInterface & { nome: string })[]>(
        []
    );
    const [matriculas, setMatriculas] = useState<MatriculasInterface[]>([]);
    const [pesquisa, setPesquisa] = useState("");
    const [addMatricula, setAddMatricula] = useState(false);
    const [editMatricula, setEditMatricula] = useState<{
        aluno: string;
        possui_revista: boolean;
        data_matricula: string;
    } | null>(null);
    const [mensagem, setMensagem] = useState<{
        titulo: string;
        mensagem: string | ReactNode;
        onConfirm: () => void;
        confirmText?: string;
        icon?: any;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [ordemColuna, setOrdemColuna] =
        useState<keyof MatriculasInterface>("alunoNome");
    const [ordem, setOrdem] = useState<"crescente" | "decrescente">(
        "crescente"
    );
    const { classes, igrejas, isLoadingData } = useDataContext();
    const { user, isSecretario, isAdmin, isSuperAdmin } = useAuthContext();

    const methods = useForm<Form>();
    const {
        reset,
        handleSubmit,
        watch,
        setValue,
        control,
        formState: { errors },
    } = methods;

    const { classe, igreja, licao } = watch();

    const onSubmit = async (data: Form) => {
        const matriculasColl = collection(db, "matriculas");
        const q = query(
            matriculasColl,
            where("licaoId", "==", data.licao),
            isSuperAdmin.current
                ? where("ministerioId", "==", user?.ministerioId)
                : where("igrejaId", "==", user?.igrejaId)
        );
        const matriculasSnap = await getDocs(q);

        if (matriculasSnap.empty) return;

        const matriculas = matriculasSnap.docs.map(
            (v) => ({ id: v.id, ...v.data() } as MatriculasInterface)
        );
        setMatriculas(matriculas);
    };

    const getLicoes = async (classeId: string) => {
        const licoesColl = collection(db, "licoes");
        const q = query(
            licoesColl,
            where("classeId", "==", classeId),
            isSuperAdmin.current
                ? where("ministerioId", "==", user?.ministerioId)
                : where("igrejaId", "==", user?.igrejaId)
        );
        const licoesSnap = await getDocs(q);

        if (licoesSnap.empty) return [];

        const licoes = licoesSnap.docs.map(
            (v) =>
                ({
                    id: v.id,
                    nome: `${v.data().titulo} - ${
                        v.data()?.numero_trimestre || 1
                    }º Trimestre de ${v
                        .data()
                        ?.data_inicio.toDate()
                        .toLocaleDateString("pt-BR", { year: "numeric" })}`,
                    ...v.data(),
                } as LicaoInterface & { nome: string })
        );

        return licoes;
    };

    const apagarMatricula = async (matricula: MatriculasInterface) => {
        setMensagem(null);
        setIsLoading(true);

        try {
            const { data } = await deletarMatricula({
                matriculaId: matricula.id,
            });

            setMensagem({
                mensagem: (data as any).message,
                onConfirm: () => {
                    onSubmit({ classe, igreja, licao });
                    setMensagem(null);
                },
                titulo: "Matricula deletada com sucesso",
                icon: <FontAwesomeIcon icon={faThumbsUp} />,
            });
        } catch (err: any) {
            console.log("deu esse erro", err);
            setMensagem({
                mensagem: err.message,
                onConfirm: () => setMensagem(null),
                titulo: "Erro ao deletar matricula",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const classesMemo = useMemo(() => {
        if (igreja) return classes.filter((v) => v.igrejaId == igreja);
        return [];
    }, [classes, igreja]);
    const matriculasMemo = useMemo(() => {
        return matriculas
            .filter(
                (v) =>
                    v.alunoNome.toLowerCase().includes(pesquisa) ||
                    v.data_matricula
                        .toDate()
                        .toLocaleDateString("pt-BR")
                        .includes(pesquisa)
            )
            .sort((a, b) => getOrdem(a, b, ordemColuna, ordem));
    }, [matriculas, pesquisa, ordem, ordemColuna]);

    useEffect(() => {
        if (classe)
            getLicoes(classe)
                .then((v) => setLicoes(v))
                .catch((err) => console.log("deu esse erro", err));
    }, [classe]);

    useEffect(() => {
        if (user) {
            if (isSecretario.current) {
                reset({
                    classe: user.classeId!,
                    igreja: user.igrejaId!,
                });

                getLicoes(user.classeId!)
                    .then((v) => setLicoes(v))
                    .catch((err) => console.log(err));
            } else if (isAdmin.current) {
                reset({
                    igreja: user.igrejaId!,
                });
            }
        }
    }, [user]);
    if (isLoadingData || isLoading) return <Loading />;
    return (
        <>
            <div className="matriculas-page">
                <div className="matriculas-page__header">
                    <div className="matriculas-page__infos">
                        <div className="matriculas-page__title">
                            <h2>Gestão de Matriculas</h2>
                        </div>

                        <motion.div
                            whileTap={{ scale: 0.9 }}
                            className="matriculas-page__cadastrar"
                        >
                            <motion.button
                                title="Matricular Aluno"
                                onTap={() => setAddMatricula(true)}
                                disabled={!licao}
                            >
                                <span>
                                    <FontAwesomeIcon icon={faPlus} />
                                </span>
                                <span>Matricular um novo aluno</span>
                            </motion.button>
                        </motion.div>
                    </div>

                    <FormProvider {...methods}>
                        <form
                            className="matriculas-page__filtros"
                            onSubmit={handleSubmit(onSubmit)}
                        >
                            <div className="matriculas-page__dropdowns">
                                {isSuperAdmin.current && (
                                    <div className="matriculas-page__dropdown">
                                        <p>Igreja</p>
                                        <Controller
                                            control={control}
                                            name="igreja"
                                            rules={{
                                                required:
                                                    "É necessário escolher uma igreja",
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
                                                    onSelect={(v) => {
                                                        field.onChange(v?.id);
                                                        setValue("classe", "");
                                                        setValue("licao", "");
                                                    }}
                                                    selectId={field.value}
                                                    isAll={false}
                                                    isErro={!!errors.igreja}
                                                />
                                            )}
                                        />

                                        {errors.igreja && (
                                            <div className="matriculas-page__dropdown--erro">
                                                <p>{errors.igreja?.message}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {(isAdmin.current || isSuperAdmin.current) && (
                                    <div className="matriculas-page__dropdown">
                                        <p>Classe</p>
                                        <Controller
                                            control={control}
                                            name="classe"
                                            rules={{
                                                required:
                                                    "É necessário escolher uma classe",
                                            }}
                                            render={({ field }) => (
                                                <Dropdown
                                                    lista={classesMemo}
                                                    current={
                                                        classesMemo.find(
                                                            (v) =>
                                                                v.id ===
                                                                field.value
                                                        )?.nome || null
                                                    }
                                                    onSelect={(v) => {
                                                        field.onChange(v?.id);
                                                        setValue("licao", "");
                                                    }}
                                                    isAll={false}
                                                    selectId={field.value}
                                                    isErro={!!errors.classe}
                                                />
                                            )}
                                        />
                                        {errors.classe && (
                                            <div className="matriculas-page__dropdown--erro">
                                                <p>{errors.classe?.message}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="matriculas-page__dropdown">
                                    <p>Lição</p>
                                    <Controller
                                        control={control}
                                        name="licao"
                                        rules={{
                                            required: "A lição é obrigatória",
                                        }}
                                        render={({ field }) => (
                                            <Dropdown
                                                lista={licoes}
                                                current={
                                                    licoes.find(
                                                        (v) =>
                                                            v.id === field.value
                                                    )?.titulo || null
                                                }
                                                onSelect={(v) =>
                                                    field.onChange(v?.id)
                                                }
                                                isAll={false}
                                                selectId={field.value}
                                                isErro={!!errors.licao}
                                            />
                                        )}
                                    />
                                    {errors.licao && (
                                        <div className="matriculas-page__dropdown--erro">
                                            <p>{errors.licao?.message}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="matriculas-page__pesquisar">
                                <button>Pesquisar</button>
                            </div>
                        </form>
                    </FormProvider>

                    <div className="matriculas-page__pesquisa">
                        <div className="matriculas-page__pesquisa-input">
                            <SearchInput
                                texto="Aluno"
                                onSearch={(v) => setPesquisa(v)}
                            />
                        </div>
                        <OrderInput
                            isCrescente={ordem === "crescente"}
                            onOrder={() =>
                                setOrdem((v) =>
                                    v === "crescente"
                                        ? "decrescente"
                                        : "crescente"
                                )
                            }
                            onSelect={(v) => setOrdemColuna(v.id as any)}
                            options={OPTIONS.filter((v) => v.isFilter)}
                        />
                        <div className="matriculas-page__total">
                            Total de matriculados:({matriculasMemo.length})
                        </div>
                    </div>
                </div>

                <div className="matriculas-page__body">
                    {matriculasMemo.length > 0 ? (
                        <TabelaDeGestao
                            currentList={matriculasMemo}
                            ordem={ordem}
                            currentOrder={ordemColuna}
                            options={OPTIONS}
                            onSelectOrder={(v) => {
                                setOrdemColuna(v.id as any);
                                setOrdem((v) =>
                                    v === "crescente"
                                        ? "decrescente"
                                        : "crescente"
                                );
                            }}
                            onEdit={(v) => {
                                const data = v.data_matricula.toDate();
                                data.setHours(12, 0, 0, 0);
                                setEditMatricula({
                                    aluno: v.alunoId,
                                    possui_revista: v.possui_revista,
                                    data_matricula: data
                                        .toISOString()
                                        .split("T")[0],
                                });
                            }}
                            onDelete={(v) => {
                                setMensagem({
                                    mensagem: (
                                        <span>
                                            Deseja deletar a matricula do aluno:{" "}
                                            <strong>{v.alunoNome}</strong>?
                                        </span>
                                    ),
                                    onConfirm: () => apagarMatricula(v),
                                    titulo: "Apagar Matricula?",
                                    confirmText: "Sim, apagar matricula",
                                });
                            }}
                        />
                    ) : (
                        <motion.div className="alunos-page__vazio">
                            <p className="alunos-page__vazio--mensagem">
                                Sem resultados
                            </p>
                            <motion.div
                                whileTap={{ scale: 0.9 }}
                                className="alunos-page__cadastrar"
                            >
                                <motion.button
                                    title="Matricular Aluno"
                                    onTap={() => setAddMatricula(true)}
                                    disabled={!licao}
                                >
                                    <span>
                                        <FontAwesomeIcon icon={faPlus} />
                                    </span>
                                    <span>Matricular um novo aluno</span>
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    )}
                </div>
            </div>
            <AnimatePresence>
                {addMatricula && licoes.length && (
                    <MatriculaModal
                        key={"matricula-aluno-modal"}
                        igrejaId={igreja}
                        licaoId={licao}
                        licao={licoes.find((v) => v.id === licao)!}
                        onClose={() => setAddMatricula(false)}
                        onSave={() => onSubmit({ classe, igreja, licao })}
                    />
                )}

                {editMatricula && licoes.length && (
                    <MatriculaAlunoModal
                        key={"aluno-edit-matricula-modal"}
                        alunoId={editMatricula.aluno}
                        revista={editMatricula.possui_revista}
                        data_matricula={editMatricula.data_matricula}
                        onSave={() => {
                            onSubmit({ classe, igreja, licao });
                            setEditMatricula(null);
                        }}
                        onClose={() => setEditMatricula(null)}
                        licao={licoes.find((v) => v.id === licao)!}
                    />
                )}

                <AlertModal
                    isOpen={!!mensagem}
                    message={mensagem?.mensagem}
                    onCancel={() => setMensagem(null)}
                    onClose={() => setMensagem(null)}
                    onConfirm={() => mensagem?.onConfirm()}
                    title={mensagem?.titulo || ""}
                    cancelText="Cancelar"
                    confirmText={mensagem?.confirmText || "Ok"}
                    icon={mensagem?.icon}
                />
            </AnimatePresence>
        </>
    );
}

export default Matriculas;
