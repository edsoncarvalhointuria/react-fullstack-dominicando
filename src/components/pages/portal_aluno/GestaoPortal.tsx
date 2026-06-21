import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../../../context/AuthContext";
import { useDataContext } from "../../../context/DataContext";
import SelectionGrid from "../../layout/selection_grid/SelectionGrid";
import { useNavigate, useParams } from "react-router-dom";
import Loading from "../../layout/loading/Loading";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db, functions } from "../../../utils/firebase";
import type { AlunoInterface, CacheAlunoInteface } from "../../../interfaces/AlunoInterface";
import type { CacheMatriculasInterface } from "../../../interfaces/MatriculasInterface";
import SearchInput from "../../ui/SearchInput";
import type { LicaoInterface } from "../../../interfaces/LicaoInterface";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faAngleDown,
    faBezierCurve,
    faCircleQuestion,
    faEye,
    faLink,
    faPenToSquare,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { AnimatePresence, motion } from "framer-motion";
import { httpsCallable } from "firebase/functions";
import CadastroAlunoModal from "../../ui/CadastroAlunoModal";
import { PedidosRespostaShareModal } from "../pedidos/PedidosResposta";
import "./gestao-portal.scss";
import LoadingModal from "../../layout/loading/LoadingModal";
import PortalAluno from "./PortalAluno";

const getLinkPortalAluno = httpsCallable(functions, "getLinkPortalAluno");

const Aluno = React.memo(
    ({
        aluno,
        onGerarLink,
        onVerPainel,
        onEditAluno,
    }: {
        aluno: AlunoInterface;
        onGerarLink: (alunoId: string) => void;
        onVerPainel: (alunoId: string) => void;
        onEditAluno: (alunoId: string) => void;
    }) => {
        const [isOpen, setIsOpen] = useState(false);

        return (
            <div className="gestao-portal__aluno">
                <motion.div className="gestao-portal__aluno-header" onTap={() => setIsOpen((v) => !v)}>
                    <h3>{aluno.nome_completo}</h3>

                    <motion.p initial={{ rotate: 0 }} animate={isOpen ? { rotate: 180 } : { rotate: 0 }}>
                        <FontAwesomeIcon icon={faAngleDown} />
                    </motion.p>
                </motion.div>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}>
                            <div className="gestao-portal__aluno-body">
                                <div className="gestao-portal__aluno-data">
                                    <div className="gestao-portal__aluno-data__desc">
                                        <h4>Data Nascimento:</h4>
                                        <p>{aluno.data_nascimento.toDate().toLocaleDateString("pt-BR")}</p>
                                        <button onClick={() => onEditAluno(aluno.id)}>
                                            <FontAwesomeIcon icon={faPenToSquare} />
                                        </button>
                                    </div>

                                    <div className="gestao-portal__aluno-data__info">
                                        <span>
                                            <FontAwesomeIcon icon={faCircleQuestion} />
                                        </span>
                                        <p>Essa data será usada no acesso. Se estiver errada, ajuste.</p>
                                    </div>
                                </div>

                                <div className="gestao-portal__aluno-buttons">
                                    <button
                                        className="gestao-portal__aluno-buttons--preview"
                                        onClick={() => {
                                            onVerPainel(aluno.id);
                                        }}
                                    >
                                        <span>
                                            <FontAwesomeIcon icon={faEye} />
                                        </span>
                                        <span>Ver Painel</span>
                                    </button>
                                    <button
                                        className="gestao-portal__aluno-buttons--link"
                                        onClick={() => {
                                            onGerarLink(aluno.id);
                                        }}
                                    >
                                        <span>
                                            <FontAwesomeIcon icon={faLink} />
                                        </span>
                                        <span>Link Acesso</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    },
);

const AlunoPortal = React.memo(({ alunoId, onClose }: { alunoId: string; onClose: () => void }) => {
    return (
        <div className="gestao-portal__acesso">
            <div className="gestao-portal__acesso--close">
                <button type="button" onClick={onClose}>
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>
            <PortalAluno alunoId={alunoId} />
        </div>
    );
});

const ListaAlunos = ({ igrejaId }: { igrejaId: string }) => {
    const [currentLicao, setCurrentLicao] = useState<LicaoInterface | null>(null);
    const [matriculados, setMatriculados] = useState<AlunoInterface[]>([]);
    const [alunos, setAlunos] = useState<AlunoInterface[]>([]);
    const [alunoId, setAlunoId] = useState("");
    const [editAluno, setEditAluno] = useState("");
    const [update, setUpdate] = useState(false);
    const [pesquisa, setPesquisa] = useState("");
    const [share, setShare] = useState<{
        alunoHash?: string;
        igrejaHash?: string;
    }>({});
    const [isLoading, setIsLoading] = useState(true);

    const { user } = useAuthContext();

    const gerarLink = useCallback(async (alunoId: string) => {
        setIsLoading(true);
        const { data } = await getLinkPortalAluno({
            alunoId,
            igrejaId,
            ministerioId: user?.ministerioId,
        });
        const resultado = data as any;
        setShare({
            alunoHash: resultado.alunoIdHash,
            igrejaHash: resultado.igrejaIdHash,
        });
        setIsLoading(false);
    }, []);
    const verPrevia = useCallback(async (alunoId: string) => {
        setAlunoId(alunoId);
    }, []);
    const fecharPrevia = useCallback(async () => {
        setAlunoId("");
    }, []);
    const editarAluno = useCallback(async (alunoId: string) => {
        setEditAluno(alunoId);
    }, []);

    const alunosMemo = useMemo(() => {
        if (!pesquisa) return alunos;

        return alunos.filter((v) => v.nome_completo.toLocaleLowerCase().includes(pesquisa));
    }, [alunos, pesquisa]);
    const matriculasMemo = useMemo(() => {
        if (!pesquisa) return matriculados;

        return matriculados.filter((v) => v.nome_completo.toLocaleLowerCase().includes(pesquisa));
    }, [matriculados, pesquisa]);

    useEffect(() => {
        if (!igrejaId) return;

        const getAlunos = async () => {
            const alunosSnap = doc(db, "cache_alunos", igrejaId);
            const alunosDocs = await getDoc(alunosSnap);

            if (!alunosDocs.exists()) return [];

            const alunos = Object.values((alunosDocs.data() as CacheAlunoInteface).lista);

            return alunos.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
        };
        const getMatriculas = async () => {
            try {
                if (!user?.classeId) return [];

                const licoesCollection = collection(db, "licoes");
                const q = query(
                    licoesCollection,
                    where("ministerioId", "==", user!.ministerioId),
                    where("igrejaId", "==", igrejaId),
                    where("classeId", "==", user!.classeId),
                    orderBy("data_inicio", "desc"),
                    limit(1),
                );
                const licoesSnap = await getDocs(q);

                if (licoesSnap.empty) return [];

                const licao = licoesSnap.docs[0].data() as LicaoInterface;
                setCurrentLicao(licao);
                const licaoId = licoesSnap.docs[0].id;

                const matriculasDoc = doc(db, "cache_matriculas", `${igrejaId}_${licaoId}`);
                const matriculasSnap = await getDoc(matriculasDoc);

                if (!matriculasSnap.exists()) return [];

                const matriculas = (matriculasSnap.data() as CacheMatriculasInterface).lista;

                return Object.values(matriculas);
            } catch {
                return [];
            }
        };

        Promise.all([getAlunos(), getMatriculas()])
            .then(([al, mt]) => {
                const ids = mt.map((v) => v.alunoId);
                const alunosMatriculados = al.filter((v) => ids.includes(v.id));
                const alunos = al.filter((v) => !ids.includes(v.id));

                setMatriculados(alunosMatriculados);
                setAlunos(alunos);
            })
            .finally(() => setIsLoading(false));
    }, [igrejaId, update]);
    return (
        <>
            {isLoading && (
                <div className="gestao-portal__loading">
                    <LoadingModal isEnviando={isLoading} mensagem="Carregando" />
                </div>
            )}
            <div className="gestao-portal" style={alunoId ? { overflow: "hidden", maxHeight: "50dvh" } : undefined}>
                <div className="gestao-portal__header">
                    <h2>
                        <span>
                            <FontAwesomeIcon icon={faBezierCurve} />
                        </span>
                        Gestão Portal Aluno
                    </h2>

                    <SearchInput onSearch={setPesquisa} texto="Aluno" />
                </div>
                <div className="gestao-portal__body">
                    {matriculasMemo.length && currentLicao ? (
                        <div className="gestao-portal__lista-alunos">
                            <div className="gestao-portal__lista-alunos--matriculados">
                                <h2>Alunos Matriculados</h2>
                                <p>
                                    {currentLicao.numero_trimestre}º Trimestre de{" "}
                                    {currentLicao.data_inicio.toDate().getFullYear()}
                                    <span>{currentLicao.titulo}</span>
                                </p>
                            </div>

                            <div className="gestao-portal__lista">
                                {matriculasMemo.map((v) => (
                                    <Aluno
                                        key={v.id}
                                        aluno={v}
                                        onGerarLink={gerarLink}
                                        onVerPainel={verPrevia}
                                        onEditAluno={editarAluno}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <></>
                    )}

                    {alunos.length ? (
                        <div className="gestao-portal__lista-alunos">
                            <h2>Lista de Alunos da Igreja</h2>

                            <div className="gestao-portal__lista">
                                {alunosMemo.map((v) => (
                                    <Aluno
                                        key={v.id}
                                        aluno={v}
                                        onGerarLink={gerarLink}
                                        onVerPainel={verPrevia}
                                        onEditAluno={editarAluno}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="gestao-portal__vazio">
                            <h3>Não existem alunos cadastrados nessa igreja.</h3>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {editAluno && (
                    <CadastroAlunoModal
                        key={"alunoModal"}
                        igrejaId={igrejaId}
                        alunoId={editAluno}
                        onCancel={() => {
                            setEditAluno("");
                        }}
                        onSave={() => setUpdate((v) => !v)}
                    />
                )}

                {share.alunoHash && share.igrejaHash ? (
                    <PedidosRespostaShareModal
                        key={"pedidos-respostas-share"}
                        link={`${window.location.origin}/portal-aluno/${share.igrejaHash}/${share.alunoHash}`}
                        onClose={() => setShare({})}
                        title="Link de Acesso ao Portal"
                    />
                ) : (
                    <></>
                )}
            </AnimatePresence>
            {alunoId && <AlunoPortal key={"aluno-portal-modal"} alunoId={alunoId} onClose={fecharPrevia} />}
        </>
    );
};

function GestaoPortal() {
    const navigate = useNavigate();
    let { igrejaId } = useParams();

    const { isSuperAdmin, user } = useAuthContext();
    const { igrejas } = useDataContext();

    if (!user) return <Loading />;
    if (!isSuperAdmin.current) igrejaId = user.igrejaId!;
    return (
        <>
            {!igrejaId ? (
                <SelectionGrid
                    onSelect={(id) => navigate(`igreja/${id}`)}
                    opcoes={igrejas}
                    titulo="Igreja"
                    sort={false}
                />
            ) : (
                <ListaAlunos igrejaId={igrejaId} />
            )}
        </>
    );
}

export default GestaoPortal;
