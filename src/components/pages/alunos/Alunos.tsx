import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faAddressCard,
    faCakeCandles,
    faCalendar,
    faFeather,
    faPhone,
    faThumbsUp,
} from "@fortawesome/free-solid-svg-icons";
import Dropdown from "../../ui/Dropdown";
import { useDataContext } from "../../../context/DataContext";
import Loading from "../../layout/loading/Loading";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import "./alunos.scss";
import type { AlunoInterface, CacheAlunoInteface } from "../../../interfaces/AlunoInterface";
import { doc, getDoc } from "firebase/firestore";
import { db, functions } from "../../../utils/firebase";
import { useNavigate } from "react-router-dom";
import SearchInput from "../../ui/SearchInput";
import CadastroAlunoModal from "../../ui/CadastroAlunoModal";
import { useAuthContext } from "../../../context/AuthContext";
import AlertModal from "../../ui/AlertModal";
import { httpsCallable } from "firebase/functions";
import { getIdade } from "../../../utils/getIdade";
import { getOrdem } from "../../../utils/getOrdem";
import TabelaDeGestao from "../../ui/TabelaDeGestao";
import OrderInput from "../../ui/OrderInput";
import ImportarCSVModal from "../../ui/ImportarCSVModal";
import ButtonsDefault from "../../ui/ButtonDefault";

const variantsItem: Variants = {
    hidden: { y: -10, opacity: 0 },
    visible: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 },
};

const variantsContainer: Variants = {
    hidden: {},
    visible: { transition: { delayChildren: stagger(0.1) } },
    exit: {},
};

const deletarAluno = httpsCallable(functions, "deletarAluno");
const salvarAlunosCSV = httpsCallable(functions, "salvarAlunosCSV");
const OPTIONS = [
    {
        nome: "Nome",
        id: "nome_completo",
        icon: faFeather,
        isFilter: true,
        placeholder: "",
    },
    {
        nome: "Data Nasc.",
        id: "data_nascimento",
        icon: faCalendar,
        isFilter: true,
        placeholder: "",
        dataObject: {},
    },
    {
        nome: "Idade",
        id: "idade",
        icon: faCakeCandles,
        isFilter: true,
        placeholder: "",
    },
    {
        nome: "Contato",
        id: "contato",
        icon: faPhone,
        isFilter: false,
        placeholder: "sem contato",
    },
    {
        nome: "Membro?",
        id: "isMembro",
        icon: faAddressCard,
        isFilter: true,
        placeholder: "",
        isBoolean: true,
    },
];
const COLUNAS = ["nome_completo", "data_nascimento(DD/MM/AAAA)", "contato(opcional)"];

function Alunos() {
    const [isLoading, setIsLoading] = useState(false);
    const [editAluno, setEditAluno] = useState("");
    const [addAluno, setAddAluno] = useState(false);
    const [importCSV, setImportCSV] = useState(false);
    const [currentIgreja, setCurrentIgreja] = useState<IgrejaInterface | null>(null);
    const [alunos, setAlunos] = useState<(AlunoInterface & { idade: string })[]>([]);
    const [update, setUpdate] = useState(false);
    const [pesquisa, setPesquisa] = useState("");
    const [ordemColuna, setOrdemColuna] = useState<
        keyof (AlunoInterface & {
            idade: number;
        })
    >("nome_completo");
    const [ordem, setOrdem] = useState<"crescente" | "decrescente">("crescente");
    const [mensagem, setMensagem] = useState<{
        titulo: string;
        mensagem: string | ReactNode;
        onConfirm: () => void;
        confirmText: string;
        icon?: any;
    } | null>(null);
    const { isLoadingData, igrejas } = useDataContext();
    const { user, isSuperAdmin, isSecretario } = useAuthContext();
    const navigate = useNavigate();

    const apagarAluno = async (alunoId: string) => {
        setIsLoading(true);
        setMensagem(null);

        try {
            const { data } = await deletarAluno({ alunoId });
            setMensagem({
                confirmText: "Ok",
                onConfirm: () => setMensagem(null),
                mensagem: (data as any).message,
                titulo: "Aluno deletado",
                icon: <FontAwesomeIcon icon={faThumbsUp} />,
            });
            setUpdate((v) => !v);
        } catch (error: any) {
            console.log("Deu esse erro", error);
            setMensagem({
                confirmText: "Ok",
                onConfirm: () => setMensagem(null),
                mensagem: error.message,
                titulo: "Erro ao deletar aluno",
            });
        } finally {
            setPesquisa("");
            setIsLoading(false);
        }
    };

    const onDeleteItem = useCallback(
        (v: any) =>
            setMensagem({
                titulo: "Deletar Aluno?",
                confirmText: "Sim, deletar aluno",
                mensagem: (
                    <>
                        <span>
                            Tem certeza que deseja deletar o aluno: <strong>{v.nome_completo}</strong>?
                        </span>
                        <span>
                            Isso irá apagar <strong>TODOS</strong> os dados associados.
                        </span>
                    </>
                ),
                onConfirm: () => apagarAluno(v.id),
            }),
        [],
    );
    const onEditItem = useCallback((v: any) => {
        setEditAluno(v.id);
    }, []);
    const onSelectOrder = useCallback((v: any) => {
        setOrdemColuna(v.id as any);
        setOrdem((v) => (v === "crescente" ? "decrescente" : "crescente"));
    }, []);

    const alunosMemo = useMemo(() => {
        let a = alunos;
        a = a.filter(
            (v) =>
                v.igrejaNome.toLowerCase().includes(pesquisa) ||
                v.nome_completo.toLowerCase().includes(pesquisa) ||
                v.data_nascimento.toDate().toLocaleDateString("pt-BR").includes(pesquisa) ||
                v.idade === pesquisa,
        );
        a = a.sort((a: any, b: any) => getOrdem(a, b, ordemColuna, ordem));
        return a;
    }, [alunos, pesquisa, ordem, ordemColuna]);
    useEffect(() => {
        const getAlunos = async (igrejaId: string) => {
            const alunosDoc = doc(db, "cache_alunos", igrejaId);
            const alunosSnap = await getDoc(alunosDoc);

            if (!alunosSnap.exists()) return [];

            const alunos = alunosSnap.data() as CacheAlunoInteface;

            return Object.values(alunos.lista).map((v) => ({
                ...v,
                idade: `${getIdade(v.data_nascimento)} anos`,
            }));
        };
        if (currentIgreja)
            getAlunos(currentIgreja.id)
                .then((a) => {
                    setAlunos(a);
                })
                .catch((err) => {
                    console.log("deu esse erro", err);
                    navigate("/alunos");
                })
                .finally(() => {
                    setIsLoading(false);
                });
    }, [currentIgreja, update]);
    useEffect(() => {
        if (igrejas.length && !isSuperAdmin.current) setCurrentIgreja(igrejas[0]);
    }, [igrejas]);
    if (isLoadingData || isLoading) return <Loading />;
    return (
        <>
            <motion.div
                className="alunos-page"
                variants={variantsContainer}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                <div className="alunos-page__header">
                    <div className="alunos-page__header-infos">
                        <h2 className="alunos-page__header-title">Gestão de Alunos</h2>

                        <ButtonsDefault
                            mensagem="Cadastrar novo aluno"
                            onClickNew={setAddAluno}
                            onClickCsv={isSecretario.current ? undefined : setImportCSV}
                        />
                    </div>

                    <div className="alunos-page__header-filtros">
                        <div className="alunos-page__header-filtro">
                            <p>Igreja:</p>
                            <Dropdown
                                lista={igrejas}
                                current={currentIgreja?.nome || null}
                                onSelect={(v) => setCurrentIgreja(v)}
                                isAll={false}
                                selectId={currentIgreja?.id}
                            />
                        </div>

                        <div className="alunos-page__header-filtro">
                            <SearchInput onSearch={setPesquisa} texto="Alunos" />
                        </div>

                        <OrderInput
                            isCrescente={ordem === "crescente"}
                            onOrder={() => setOrdem((v) => (v === "crescente" ? "decrescente" : "crescente"))}
                            onSelect={(v) => setOrdemColuna(v.id as any)}
                            options={OPTIONS.filter((v) => v.isFilter)}
                        />

                        <div className="alunos-page__header-qtd">
                            <p>Total de Alunos: ({alunosMemo.length})</p>
                        </div>
                    </div>
                </div>

                <div className="alunos-page__body">
                    <AnimatePresence>
                        {alunosMemo.length > 0 ? (
                            <TabelaDeGestao
                                currentList={alunosMemo}
                                currentOrder={ordemColuna}
                                ordem={ordem}
                                options={OPTIONS}
                                onSelectOrder={onSelectOrder}
                                onEdit={onEditItem}
                                onDelete={onDeleteItem}
                            />
                        ) : (
                            <motion.div className="alunos-page__vazio" variants={variantsItem}>
                                <p className="alunos-page__vazio--mensagem">Sem resultados</p>
                                <ButtonsDefault mensagem="Cadastrar novo aluno" onClickNew={setAddAluno} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
            <AnimatePresence>
                {(addAluno || editAluno) && (
                    <CadastroAlunoModal
                        onCancel={() => {
                            setAddAluno(false);
                            setEditAluno("");
                        }}
                        onSave={(value) => {
                            const alunoComIdade = {
                                ...value,
                                idade: `${getIdade(value.data_nascimento)} anos`,
                            };
                            if (!editAluno) setAlunos((v) => [...v, alunoComIdade]);
                            else setAlunos((v) => [...v.filter((a) => a.id !== editAluno), alunoComIdade]);

                            setAddAluno(false);
                            setEditAluno("");
                        }}
                        alunoId={editAluno}
                        igrejaId={currentIgreja?.id || user?.igrejaId || ""}
                    />
                )}
                {importCSV && (
                    <ImportarCSVModal
                        key={"importar-csv-aluno"}
                        igreja
                        listaColunas={COLUNAS}
                        onCancel={() => setImportCSV(false)}
                        onSave={() => setUpdate((v) => !v)}
                        firebaseFunction={salvarAlunosCSV}
                        igrejaId={currentIgreja?.id}
                    />
                )}
            </AnimatePresence>

            <AlertModal
                isOpen={!!mensagem}
                message={mensagem?.mensagem}
                title={mensagem?.titulo || ""}
                onCancel={() => setMensagem(null)}
                onClose={() => setMensagem(null)}
                onConfirm={() => mensagem?.onConfirm()}
                confirmText={mensagem?.confirmText}
                icon={mensagem?.icon}
            />
        </>
    );
}

export default Alunos;
