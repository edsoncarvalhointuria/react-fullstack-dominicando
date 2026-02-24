import {
    useController,
    useFormContext,
    useWatch,
    type Control,
    type UseFormGetValues,
    type UseFormSetValue,
} from "react-hook-form";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBookmark,
    faBookOpen,
    faCheck,
    faCircleCheck,
    faClock,
    faMountainSun,
    faPlus,
    faSquareCheck,
    faSquareXmark,
    faUserPen,
    faWandMagicSparkles,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { MatriculasInterface } from "../../../interfaces/MatriculasInterface";
import { AnimatePresence, motion } from "framer-motion";
import React, { useMemo, useState } from "react";
import SearchInput from "../../ui/SearchInput";

interface Props {
    matriculas: MatriculasInterface[];
    onEditAluno: (id?: string) => void;
    onCadastradarAluno: () => void;
    podeMatricular: boolean;
}

const VarinhaMaginaModal = ({
    semCadastro,
    alterarItens,
    alterarPresenca,
    onClick,
}: any) => {
    const OPCOES_STATUS = [
        { nome: "Tds. Presente", opcao: "Presente", icon: faCheck },
        { nome: "Todos Atrasados", opcao: "Atrasado", icon: faClock },
        { nome: "Todos c. Falta", opcao: "Falta", icon: faXmark },
        {
            nome: "Tds Falta Justificada",
            opcao: "Falta Justificada",
            icon: faMountainSun,
        },
    ];
    const OPCOES_ITENS = [
        {
            nome: "Todos C. Revista",
            item: "licao",
            acao: "adicionar",
            icon: faBookOpen,
        },
        {
            nome: "Todos S. Revista",
            item: "licao",
            acao: "remover",
            icon: faBookmark,
        },
        {
            nome: "Todos Com Bíblia",
            item: "biblia",
            acao: "adicionar",
            icon: faBookOpen,
        },
        {
            nome: "Todos Sem Bíblia",
            item: "biblia",
            acao: "remover",
            icon: faBookOpen,
        },
    ];

    return (
        <motion.div
            key={"chamada-page-lista-actions"}
            className={`chamada-page__filtro__actions-lista ${semCadastro ? "chamada-page__filtro__actions-lista--direita" : ""}`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
        >
            <div className="chamada-page__filtro__actions-action">
                {OPCOES_STATUS.map((v, i) => (
                    <button
                        key={i}
                        type="button"
                        title={v.nome}
                        onClick={() => {
                            alterarPresenca(v.opcao);
                            onClick();
                        }}
                    >
                        <span>
                            <FontAwesomeIcon icon={v.icon} />
                        </span>
                        {v.nome}
                    </button>
                ))}
            </div>
            <hr />
            <div className="chamada-page__filtro__actions-action">
                {OPCOES_ITENS.map((v, i) => (
                    <button
                        key={i}
                        type="button"
                        title={v.nome}
                        onClick={() => {
                            alterarItens(v.item, v.acao);
                            onClick();
                        }}
                    >
                        <span>
                            <FontAwesomeIcon icon={v.icon} />
                        </span>
                        {v.nome}
                    </button>
                ))}
            </div>
        </motion.div>
    );
};
const BotoesChamada = ({
    podeMatricular,
    onCadastradarAluno,
    alterarItens,
    alterarPresenca,
}: {
    podeMatricular: boolean;
    onCadastradarAluno: () => void;
    alterarPresenca: (
        label: "Presente" | "Falta" | "Atrasado" | "Falta Justificada",
    ) => void;
    alterarItens: (
        item: "biblia" | "licao",
        acao: "remover" | "adicionar",
    ) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="chamada-page__filtro--buttons">
            <div className="chamada-page__filtro__actions">
                <button
                    title="Abrir Menu"
                    className="chamada-page__filtro__actions--button"
                    type="button"
                    onClick={() => setIsOpen((v) => !v)}
                >
                    <FontAwesomeIcon
                        className="chamada-page__filtro__varinha"
                        icon={faWandMagicSparkles}
                    />
                </button>
                <AnimatePresence>
                    {isOpen && (
                        <VarinhaMaginaModal
                            semCadastro={podeMatricular}
                            alterarItens={alterarItens}
                            alterarPresenca={alterarPresenca}
                            onClick={() => setIsOpen(false)}
                        />
                    )}
                </AnimatePresence>
            </div>
            {podeMatricular && (
                <button
                    className="chamada-page__filtro__button-new"
                    type="button"
                    onClick={() => onCadastradarAluno()}
                >
                    <FontAwesomeIcon
                        className="chamada-page__filtro__add-new"
                        icon={faPlus}
                    />

                    <span>matricular aluno</span>
                </button>
            )}
        </div>
    );
};
const AlunoChamada = React.memo(
    ({
        aluno,
        onEditAluno,
        isLicaoChecked,
        isBibliaChecked,
        control,
        getValues,
        setValue,
    }: {
        onEditAluno: (id: string) => void;
        aluno: MatriculasInterface;
        isLicaoChecked: boolean;
        isBibliaChecked: boolean;
        control: Control<any>;
        getValues: UseFormGetValues<any>;
        setValue: UseFormSetValue<any>;
    }) => {
        const STATUS = ["Presente", "Atrasado", "Falta", "Falta Justificada"];
        const input = useController({
            control,
            name: `chamada.${aluno.alunoId}`,
            defaultValue: "Presente",
        });

        const updateLicao = (id: string, remove: boolean) => {
            const licoes = getValues("licoesTrazidas");
            setValue(
                "licoesTrazidas",
                remove ? licoes.filter((v: any) => v !== id) : [...licoes, id],
            );
            if (remove)
                setValue("totalLicoes", (getValues("totalLicoes") || 1) - 1);
            else setValue("totalLicoes", (getValues("totalLicoes") || 0) + 1);
        };
        const updateBiblia = (id: string, remove: boolean) => {
            const biblias = getValues("bibliasTrazidas");
            setValue(
                "bibliasTrazidas",
                remove
                    ? biblias.filter((v: any) => v !== id)
                    : [...biblias, id],
            );
            if (remove)
                setValue("totalBiblias", (getValues("totalBiblias") || 1) - 1);
            else setValue("totalBiblias", (getValues("totalBiblias") || 0) + 1);
        };

        return (
            <li className="lista-chamada__aluno">
                <div className="lista-chamada__aluno--header">
                    <div className="lista-chamada__infos">
                        <button
                            type="button"
                            title="Editar Aluno"
                            onClick={() => onEditAluno(aluno.alunoId)}
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
                        {STATUS.map((status, i) => (
                            <div key={status + i}>
                                <input
                                    type="radio"
                                    className={status
                                        .toLowerCase()
                                        .replace(/\s/g, "-")}
                                    id={`${aluno.alunoId}-${status}`}
                                    {...input.field}
                                    checked={input.field.value === status}
                                    onChange={() => {
                                        input.field.onChange(status);
                                        const licoesTrazidas =
                                            getValues("licoesTrazidas");
                                        const bibliasTrazidas =
                                            getValues("bibliasTrazidas");
                                        const isAusencia =
                                            status === "Falta Justificada" ||
                                            status === "Falta";

                                        if (isAusencia) {
                                            if (
                                                licoesTrazidas.includes(
                                                    aluno.alunoId,
                                                )
                                            )
                                                updateLicao(
                                                    aluno.alunoId,
                                                    true,
                                                );
                                            if (
                                                bibliasTrazidas.includes(
                                                    aluno.alunoId,
                                                )
                                            )
                                                updateBiblia(
                                                    aluno.alunoId,
                                                    true,
                                                );
                                        } else {
                                            if (
                                                !bibliasTrazidas.includes(
                                                    aluno.alunoId,
                                                )
                                            )
                                                updateBiblia(
                                                    aluno.alunoId,
                                                    false,
                                                );
                                            if (
                                                !licoesTrazidas.includes(
                                                    aluno.alunoId,
                                                ) &&
                                                aluno.possui_revista
                                            )
                                                updateLicao(
                                                    aluno.alunoId,
                                                    false,
                                                );
                                        }
                                    }}
                                />
                                <label htmlFor={`${aluno.alunoId}-${status}`}>
                                    {status}
                                </label>
                            </div>
                        ))}
                    </div>

                    {input.field.value === "Falta" ||
                    input.field.value === "Falta Justificada" ? (
                        <></>
                    ) : (
                        <div className="lista-chamada__checks">
                            <div>
                                <input
                                    title="Clique para Atualizar"
                                    type="checkbox"
                                    value={aluno.alunoId}
                                    checked={isLicaoChecked}
                                    onChange={() => {
                                        if (
                                            getValues(
                                                "licoesTrazidas",
                                            )?.includes(aluno.alunoId)
                                        ) {
                                            updateLicao(aluno.alunoId, true);
                                        } else {
                                            updateLicao(aluno.alunoId, false);
                                        }
                                    }}
                                />
                                <label htmlFor={`revista-${aluno.alunoId}`}>
                                    {isLicaoChecked ? (
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
                                    checked={isBibliaChecked}
                                    onChange={() => {
                                        if (
                                            getValues(
                                                "bibliasTrazidas",
                                            ).includes(aluno.alunoId)
                                        ) {
                                            updateBiblia(aluno.alunoId, true);
                                        } else {
                                            updateBiblia(aluno.alunoId, false);
                                        }
                                    }}
                                />
                                <label htmlFor={`biblia-${aluno.alunoId}`}>
                                    {isBibliaChecked ? (
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
            </li>
        );
    },
);

function ListaChamada({
    matriculas,
    onCadastradarAluno,
    podeMatricular,
    onEditAluno,
}: Props) {
    const [pesquisa, setPesquisa] = useState("");

    const matriculasMemo = useMemo(() => {
        return matriculas
            .filter(
                (v) =>
                    v.alunoNome.toLowerCase().includes(pesquisa) ||
                    v.alunoId.toLowerCase() === pesquisa,
            )
            .sort((a, b) => a.alunoNome.localeCompare(b.alunoNome));
    }, [matriculas, pesquisa]);

    const { setValue, getValues, control } = useFormContext();
    const licoes = useWatch({ control, name: "licoesTrazidas" });
    const biblias = useWatch({ control, name: "bibliasTrazidas" });

    const alterarPresenca = (
        label: "Presente" | "Falta" | "Atrasado" | "Falta Justificada",
    ) => {
        const presentes = matriculas.reduce(
            (prev, acc) => ({ [acc.alunoId]: label, ...prev }),
            {},
        );
        setValue("chamada", presentes as any);

        if (label === "Falta" || label === "Falta Justificada") {
            setValue("bibliasTrazidas", []);
            setValue("licoesTrazidas", []);
            setValue("totalBiblias", 0);
            setValue("totalLicoes", 0);
        } else {
            const idsRevista = matriculas
                .filter((v) => v.possui_revista)
                .map((v) => v.alunoId);
            const idsBiblias = Object.keys(presentes);

            setValue("bibliasTrazidas", idsBiblias);
            setValue("licoesTrazidas", idsRevista);
            setValue("totalBiblias", idsBiblias.length);
            setValue("totalLicoes", idsRevista.length);
        }
    };
    const alterarItens = (
        item: "biblia" | "licao",
        acao: "remover" | "adicionar",
    ) => {
        const chamada = getValues("chamada");
        const opcao = item === "biblia" ? "bibliasTrazidas" : "licoesTrazidas";
        const opcaoTotal = item === "biblia" ? "totalBiblias" : "totalLicoes";
        if (acao === "remover") {
            setValue(opcao, []);
            setValue(opcaoTotal, 0);
        } else {
            const ids = matriculas
                .filter((v) => (item === "licao" ? v.possui_revista : true))
                .map((v) => v.alunoId)
                .filter(
                    (v) =>
                        chamada[v] !== "Falta" &&
                        chamada[v] !== "Falta Justificada",
                );
            setValue(opcao, ids);
            setValue(opcaoTotal, ids.length);
        }
    };

    return (
        <>
            <div className="chamada-page__filtro">
                <SearchInput onSearch={(texto) => setPesquisa(texto)} />

                <BotoesChamada
                    onCadastradarAluno={onCadastradarAluno}
                    podeMatricular={podeMatricular}
                    alterarItens={alterarItens}
                    alterarPresenca={alterarPresenca}
                />
            </div>

            <ul className="lista-chamada">
                {matriculasMemo.map((aluno) => (
                    <AlunoChamada
                        key={aluno.alunoId}
                        aluno={aluno}
                        onEditAluno={onEditAluno}
                        isBibliaChecked={biblias.includes(aluno.alunoId)}
                        isLicaoChecked={licoes.includes(aluno.alunoId)}
                        control={control}
                        getValues={getValues}
                        setValue={setValue}
                    />
                ))}
            </ul>
        </>
    );
}

export default React.memo(ListaChamada);
