import { useEffect, useMemo, useState } from "react";
import "./matricula-modal.scss";
import type { AlunoInterface, CacheAlunoInteface } from "../../interfaces/AlunoInterface";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAddressCard, faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import SearchInput from "./SearchInput";
import { AnimatePresence } from "framer-motion";
import CadastroAlunoModal from "./CadastroAlunoModal";
import type { LicaoInterface } from "../../interfaces/LicaoInterface";
import MatriculaAlunoModal from "./MatriculaAlunoModal";
import type { CacheMatriculasInterface } from "../../interfaces/MatriculasInterface";

function MatriculaModal({
    onClose,
    onSave,
    igrejaId,
    licaoId,
    licao,
}: {
    onClose: () => void;
    onSave: (aluno?: any) => void;
    igrejaId: string;
    licaoId: string;
    licao: LicaoInterface;
}) {
    const [alunos, setAlunos] = useState<AlunoInterface[]>([]);
    const [aluno, setAluno] = useState<AlunoInterface | null>(null);
    const [showCadastrarAluno, setShowCadastradarAluno] = useState(false);
    const [pesquisa, setPesquisa] = useState("");

    const alunosMemo = useMemo(() => {
        let a = alunos.filter(
            (v) =>
                v.nome_completo.toLowerCase().includes(pesquisa) ||
                v.contato?.toLocaleLowerCase()?.includes(pesquisa) ||
                v.data_nascimento.toDate().toLocaleDateString("pt-BR").includes(pesquisa),
        );
        return a;
    }, [alunos, pesquisa]);
    useEffect(() => {
        const getAlunos = async (igrejaId: string) => {
            const alunosColl = doc(db, "cache_alunos", igrejaId);
            const alunosSnap = await getDoc(alunosColl);

            if (!alunosSnap.exists()) return [];

            const a = alunosSnap.data() as CacheAlunoInteface;

            return Object.values(a.lista);
        };
        const getMatriculados = async (igrejaId: string, licaoId: string) => {
            const matriculasColl = doc(db, "cache_matriculas", `${igrejaId}_${licaoId}`);
            const matriculasSnap = await getDoc(matriculasColl);
            if (!matriculasSnap.exists()) return [];
            const matriculas = Object.values((matriculasSnap.data() as CacheMatriculasInterface).lista);

            return matriculas.map((v) => v.alunoId);
        };

        Promise.all([getAlunos(igrejaId), getMatriculados(igrejaId, licaoId)])
            .then(([a, m]) => {
                setAlunos(a.filter((v) => !m.includes(v.id)));
            })
            .catch((err) => console.log("deu esse erro", err));
    }, [licaoId, igrejaId]);
    return (
        <>
            <div className="matricula-modal__overlay">
                <div className="matricula-modal">
                    <div className="matricula-modal__header">
                        <div className="matricula-modal__title">
                            <span>
                                <FontAwesomeIcon icon={faAddressCard} />
                            </span>
                            <h2>Matricular Novo Aluno</h2>
                        </div>
                        <div className="matricula-modal__close" onClick={() => onClose()}>
                            <span>
                                <FontAwesomeIcon icon={faXmark} />
                            </span>
                        </div>
                    </div>

                    <div className="matricula-modal__body">
                        <div className="matricula-modal__cadastrar">
                            <button
                                className="matricula-modal__cadastrar--button"
                                title="Cadastrar Novo Aluno"
                                onClick={() => setShowCadastradarAluno(true)}
                            >
                                <span>
                                    <FontAwesomeIcon icon={faPlus} />
                                </span>
                                Cadastre um novo aluno
                            </button>
                        </div>

                        <div className="matricula-modal__lista">
                            <div className="matricula-modal__lista-pesquisa">
                                <SearchInput texto="Aluno" onSearch={setPesquisa} />
                            </div>

                            <div className="matricula-modal__alunos">
                                {alunosMemo.length > 0 ? (
                                    <>
                                        <div className="matricula-modal__alunos--title">
                                            <h3>Alunos Não Matriculados:</h3>
                                        </div>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Nome</th>
                                                    <th>Data Nascimento</th>
                                                    <th>Contato</th>
                                                    <th></th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {alunosMemo.map((v) => (
                                                    <tr
                                                        key={v.id}
                                                        className="matricula-modal__aluno"
                                                        onClick={() => setAluno(v)}
                                                    >
                                                        <td data-label="Nome" className="matricula-modal__aluno--nome">
                                                            <p>{v.nome_completo}</p>
                                                        </td>

                                                        <td
                                                            data-label="Nascimento"
                                                            className="matricula-modal__aluno--nascimento"
                                                        >
                                                            <p>
                                                                {v.data_nascimento.toDate().toLocaleDateString("pt-BR")}
                                                            </p>
                                                        </td>
                                                        <td
                                                            data-label="Contato"
                                                            className="matricula-modal__aluno--contato"
                                                        >
                                                            <p>{v.contato || "-"}</p>
                                                        </td>
                                                        <td
                                                            data-label="Cadatrar"
                                                            className="matricula-modal__aluno--contato"
                                                        >
                                                            <span>
                                                                <FontAwesomeIcon icon={faPlus} />
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </>
                                ) : (
                                    <div className="matricula-modal__vazio-infos">
                                        <p>Nenhum Aluno Encontrado</p>

                                        <button
                                            className="matricula-modal__cadastrar--button"
                                            title="Cadastrar Novo Aluno"
                                            onClick={() => setShowCadastradarAluno(true)}
                                        >
                                            <span>
                                                <FontAwesomeIcon icon={faPlus} />
                                            </span>
                                            Cadastre um novo aluno
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showCadastrarAluno && (
                    <CadastroAlunoModal
                        key={"cadastro-aluno-modal"}
                        igrejaId={igrejaId}
                        onCancel={() => setShowCadastradarAluno(false)}
                        onSave={(v) => {
                            setAlunos([...alunos, v]);
                            setAluno(v);
                            setShowCadastradarAluno(false);
                        }}
                    />
                )}

                {aluno && (
                    <MatriculaAlunoModal
                        key={"matricula-aluno-modal"}
                        aluno={aluno}
                        licao={licao}
                        onSave={(aluno: string) => {
                            onSave(aluno);
                            onClose();
                        }}
                        onClose={() => setAluno(null)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

export default MatriculaModal;
