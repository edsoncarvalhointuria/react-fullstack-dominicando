import { useFormContext } from "react-hook-form";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCircleCheck,
    faSquareCheck,
    faSquareXmark,
    faUserPen,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { MatriculasInterface } from "../../../interfaces/MatriculasInterface";
import { motion } from "framer-motion";

interface Props {
    matriculas: MatriculasInterface[];
    setEditAluno: (aluno: string) => void;
}

function ListaChamada({ matriculas, setEditAluno }: Props) {
    const { register, watch, setValue } = useFormContext();
    const chamada = watch("chamada");
    const biblias = watch("bibliasTrazidas");
    const revistas = watch("licoesTrazidas");
    const totalLicoes = watch("totalLicoes");
    const totalBiblias = watch("totalBiblias");

    const removeLicao = (aluno: MatriculasInterface) => {
        setValue(
            "licoesTrazidas",
            revistas.filter((v: any) => v !== aluno.alunoId)
        );
        setValue("totalLicoes", (totalLicoes || 1) - 1);
    };
    const removeBiblia = (aluno: MatriculasInterface) => {
        setValue(
            "bibliasTrazidas",
            biblias.filter((v: any) => v !== aluno.alunoId)
        );
        setValue("totalBiblias", (totalBiblias || 1) - 1);
    };
    const addLicao = (aluno: MatriculasInterface) => {
        setValue("licoesTrazidas", [...revistas, aluno.alunoId]);
        setValue("totalLicoes", (totalLicoes || 0) + 1);
    };
    const addBiblia = (aluno: MatriculasInterface) => {
        setValue("bibliasTrazidas", [...biblias, aluno.alunoId]);
        setValue("totalBiblias", (totalBiblias || 0) + 1);
    };
    return (
        <motion.ul
            className="lista-chamada"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
        >
            {matriculas
                .sort((a, b) => a.alunoNome.localeCompare(b.alunoNome))
                .map((aluno) => (
                    <motion.li
                        layout
                        key={aluno.alunoId}
                        className="lista-chamada__aluno"
                    >
                        <div className="lista-chamada__aluno--header">
                            <div className="lista-chamada__infos">
                                <button
                                    type="button"
                                    title="Editar Aluno"
                                    onClick={() => setEditAluno(aluno.alunoId)}
                                >
                                    <FontAwesomeIcon icon={faUserPen} />
                                </button>
                                <h3>{aluno.alunoNome}</h3>
                            </div>
                            <div className="lista-chamada__revista">
                                <p>Tem Revista?</p>
                                {aluno.possui_revista ? (
                                    <span>
                                        <FontAwesomeIcon
                                            className="com-revista"
                                            icon={faSquareCheck}
                                        />
                                    </span>
                                ) : (
                                    <span>
                                        <FontAwesomeIcon
                                            className="sem-revista"
                                            icon={faSquareXmark}
                                        />
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="lista-chamada__aluno--body">
                            <div className="lista-chamada__radios">
                                <p>Status:</p>
                                {[
                                    "Presente",
                                    "Atrasado",
                                    "Falta",
                                    "Falta Justificada",
                                ].map((status) => (
                                    <motion.div key={status}>
                                        <input
                                            type="radio"
                                            className={status
                                                .toLowerCase()
                                                .replace(/\s/g, "-")}
                                            id={`${aluno.alunoId}-${status}`}
                                            value={status}
                                            {...register(
                                                `chamada.${aluno.alunoId}`
                                            )}
                                            defaultChecked={
                                                chamada[aluno.alunoId] ===
                                                    status ||
                                                status === "Presente"
                                            }
                                            onClick={() => {
                                                if (
                                                    status ===
                                                        "Falta Justificada" ||
                                                    status === "Falta"
                                                ) {
                                                    if (
                                                        biblias.includes(
                                                            aluno.alunoId
                                                        )
                                                    )
                                                        removeBiblia(aluno);
                                                    if (
                                                        revistas.includes(
                                                            aluno.alunoId
                                                        )
                                                    )
                                                        removeLicao(aluno);
                                                } else {
                                                    if (
                                                        !biblias.includes(
                                                            aluno.alunoId
                                                        )
                                                    )
                                                        addBiblia(aluno);
                                                    if (
                                                        !revistas.includes(
                                                            aluno.alunoId
                                                        ) &&
                                                        aluno.possui_revista
                                                    )
                                                        addLicao(aluno);
                                                }
                                            }}
                                        />
                                        <label
                                            htmlFor={`${aluno.alunoId}-${status}`}
                                        >
                                            {status}
                                        </label>
                                    </motion.div>
                                ))}
                            </div>

                            {chamada[aluno.alunoId] === "Falta" ||
                            chamada[aluno.alunoId] === "Falta Justificada" ? (
                                <></>
                            ) : (
                                <div className="lista-chamada__checks">
                                    <div>
                                        <input
                                            title="Clique para Atualizar"
                                            type="checkbox"
                                            value={aluno.alunoId}
                                            checked={revistas.includes(
                                                aluno.alunoId
                                            )}
                                            onChange={() => {
                                                if (
                                                    revistas.includes(
                                                        aluno.alunoId
                                                    )
                                                ) {
                                                    removeLicao(aluno);
                                                } else {
                                                    addLicao(aluno);
                                                }
                                            }}
                                        />
                                        <label
                                            htmlFor={`revista-${aluno.alunoId}`}
                                        >
                                            {revistas.includes(
                                                aluno.alunoId
                                            ) ? (
                                                <>
                                                    <span>
                                                        <FontAwesomeIcon
                                                            icon={faCircleCheck}
                                                        />
                                                    </span>
                                                    Trouxe Lição
                                                </>
                                            ) : (
                                                <>
                                                    <span>
                                                        <FontAwesomeIcon
                                                            icon={faXmark}
                                                        />
                                                    </span>
                                                    Não Trouxe Lição
                                                </>
                                            )}
                                        </label>
                                    </div>
                                    <div>
                                        <input
                                            title="Clique para Atualizar"
                                            type="checkbox"
                                            id={`biblia-${aluno.alunoId}`}
                                            value={aluno.alunoId}
                                            checked={biblias.includes(
                                                aluno.alunoId
                                            )}
                                            onChange={() => {
                                                if (
                                                    biblias.includes(
                                                        aluno.alunoId
                                                    )
                                                ) {
                                                    removeBiblia(aluno);
                                                } else {
                                                    addBiblia(aluno);
                                                }
                                            }}
                                        />
                                        <label
                                            htmlFor={`biblia-${aluno.alunoId}`}
                                        >
                                            {biblias.includes(aluno.alunoId) ? (
                                                <>
                                                    <span>
                                                        <FontAwesomeIcon
                                                            icon={faCircleCheck}
                                                        />
                                                    </span>
                                                    Trouxe Bíblia
                                                </>
                                            ) : (
                                                <>
                                                    <span>
                                                        <FontAwesomeIcon
                                                            icon={faXmark}
                                                        />
                                                    </span>
                                                    Não Trouxe Bíblia
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.li>
                ))}
        </motion.ul>
    );
}

export default ListaChamada;
