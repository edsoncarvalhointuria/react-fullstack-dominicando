import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import type { MatriculasInterface } from "../../../interfaces/MatriculasInterface";
import React, { useState } from "react";
import type {
    UseFormGetValues,
    UseFormRegister,
    UseFormSetValue,
} from "react-hook-form";

interface AcordeaoItem {
    titulo: string;
    icone: any;
    total: string | number;
    listaAlunos: MatriculasInterface[];
    form?: {
        register: UseFormRegister<any>;
        name: string;
        setValue: UseFormSetValue<any>;
        getValues: UseFormGetValues<any>;
    };
}
export const AcordeaoItem = React.memo(
    ({ titulo, icone, total, listaAlunos, form }: AcordeaoItem) => {
        const [isOpen, setIsOpen] = useState(false);
        return (
            <div className="resumo-chamada__acordeao-item">
                <div
                    className="resumo-chamada__item-header"
                    onClick={() => setIsOpen((v) => !v)}
                >
                    <div className="resumo-chamada__item-header-label">
                        <FontAwesomeIcon icon={icone} />
                        <h4>{titulo}</h4>
                    </div>
                    <motion.span
                        className="resumo-chamada__item-header-chevron"
                        animate={{ rotate: isOpen ? 180 : 0 }}
                    >
                        <FontAwesomeIcon icon={faChevronDown} />
                    </motion.span>
                    <p className="resumo-chamada__item-header-total">{total}</p>
                </div>
                <AnimatePresence>
                    {isOpen && (
                        <motion.ul
                            className="resumo-chamada__acordeao-lista"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                        >
                            {listaAlunos.length > 0 ? (
                                <>
                                    {form && listaAlunos.length > 1 && (
                                        <li className="resumo-chamada__acordeao-lista--selecionar-todos">
                                            <input
                                                type="checkbox"
                                                name={`selecionar-todos-${titulo}`}
                                                id={`selecionar-todos-${titulo}`}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        const dados = new Set([
                                                            ...(form.getValues(
                                                                form.name,
                                                            ) || []),
                                                            ...listaAlunos.map(
                                                                (v) =>
                                                                    v.alunoId,
                                                            ),
                                                        ]);
                                                        form.setValue(
                                                            form.name,
                                                            Array.from(dados),
                                                        );
                                                    } else
                                                        form.setValue(
                                                            form.name,
                                                            (
                                                                (form.getValues(
                                                                    form.name,
                                                                ) as string[]) ||
                                                                []
                                                            ).filter(
                                                                (v) =>
                                                                    !listaAlunos.find(
                                                                        (a) =>
                                                                            a.alunoId ===
                                                                            v,
                                                                    ),
                                                            ),
                                                        );
                                                }}
                                            />
                                            <label
                                                htmlFor={`selecionar-todos-${titulo}`}
                                            >
                                                Selecionar Todos
                                            </label>
                                        </li>
                                    )}
                                    {listaAlunos.map((aluno) => (
                                        <li key={aluno.alunoId}>
                                            {form ? (
                                                <>
                                                    <input
                                                        type="checkbox"
                                                        id={`input-resumo-${aluno.alunoId}`}
                                                        value={aluno.alunoId}
                                                        {...form.register(
                                                            form.name,
                                                        )}
                                                    />

                                                    <label
                                                        htmlFor={`input-resumo-${aluno.alunoId}`}
                                                    >
                                                        {aluno.alunoNome}
                                                    </label>
                                                </>
                                            ) : (
                                                <p>{aluno.alunoNome}</p>
                                            )}
                                        </li>
                                    ))}
                                </>
                            ) : (
                                <li className="lista-vazia">
                                    Nenhum aluno nesta categoria.
                                </li>
                            )}
                        </motion.ul>
                    )}
                </AnimatePresence>
            </div>
        );
    },
);

export const InfoLinha = ({
    icon,
    label,
    value,
    isTotal = false,
}: {
    icon: any;
    label: string;
    value: string | number;
    isTotal?: boolean;
}) => (
    <div className={`info-linha ${isTotal ? "info-linha--total" : ""}`}>
        <div className="info-linha__label">
            <FontAwesomeIcon icon={icon} />
            <span>{label}</span>
        </div>
        <div className="info-linha__valor">{value}</div>
    </div>
);
