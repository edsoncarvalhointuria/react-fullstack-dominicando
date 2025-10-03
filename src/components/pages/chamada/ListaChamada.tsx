import { useFormContext } from "react-hook-form";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSquareCheck,
    faSquareXmark,
    faUserPen,
} from "@fortawesome/free-solid-svg-icons";
import type { MatriculasInterface } from "../../../interfaces/MatriculasInterface";
import { motion } from "framer-motion";
import { useEffect } from "react";

interface Props {
    matriculas: MatriculasInterface[];
}

function ListaChamada({ matriculas }: Props) {
    const { register, watch, setValue } = useFormContext();
    const chamada = watch("chamada");
    const biblias = watch("bibliasTrazidas");
    const revistas = watch("licoesTrazidas");

    useEffect(() => {
        for (let id in chamada) {
            const status = chamada[id];
            if (status === "Falta" || status === "Falta Justificada") {
                setValue(
                    "licoesTrazidas",
                    revistas.filter((v: any) => v !== id)
                );
                setValue(
                    "bibliasTrazidas",
                    biblias.filter((v: any) => v !== id)
                );
            }
        }
    }, [chamada]);
    useEffect(() => {
        setValue("totalBiblias", biblias.length);
        setValue("totalLicoes", revistas.length);
    }, [biblias, revistas]);
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
                                <button type="button" title="Editar Aluno">
                                    <FontAwesomeIcon icon={faUserPen} />
                                </button>
                                <h3>{aluno.alunoNome}</h3>
                            </div>
                            <div className="lista-chamada__revista">
                                <p>Tem Revista?</p>
                                {aluno.possui_revista ? (
                                    <FontAwesomeIcon
                                        className="com-revista"
                                        icon={faSquareCheck}
                                    />
                                ) : (
                                    <FontAwesomeIcon
                                        className="sem-revista"
                                        icon={faSquareXmark}
                                    />
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
                                                    setValue(
                                                        "bibliasTrazidas",
                                                        biblias.filter(
                                                            (b: any) =>
                                                                b !==
                                                                aluno.alunoId
                                                        )
                                                    );
                                                    setValue(
                                                        "licoesTrazidas",
                                                        revistas.filter(
                                                            (r: any) =>
                                                                r !==
                                                                aluno.alunoId
                                                        )
                                                    );
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
                                                    setValue(
                                                        "licoesTrazidas",
                                                        revistas.filter(
                                                            (v: any) =>
                                                                v !==
                                                                aluno.alunoId
                                                        )
                                                    );
                                                } else
                                                    setValue("licoesTrazidas", [
                                                        ...revistas,
                                                        aluno.alunoId,
                                                    ]);
                                            }}
                                        />
                                        <label
                                            htmlFor={`revista-${aluno.alunoId}`}
                                        >
                                            Trouxe Lição?
                                        </label>
                                    </div>
                                    <div>
                                        <input
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
                                                    setValue(
                                                        "bibliasTrazidas",
                                                        biblias.filter(
                                                            (v: any) =>
                                                                v !==
                                                                aluno.alunoId
                                                        )
                                                    );
                                                } else
                                                    setValue(
                                                        "bibliasTrazidas",
                                                        [
                                                            ...biblias,
                                                            aluno.alunoId,
                                                        ]
                                                    );
                                            }}
                                        />
                                        <label
                                            htmlFor={`biblia-${aluno.alunoId}`}
                                        >
                                            Trouxe Bíblia?
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
