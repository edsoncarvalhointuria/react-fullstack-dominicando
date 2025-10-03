import { AnimatePresence, motion } from "framer-motion";
import type { MatriculasInterface } from "../../../interfaces/MatriculasInterface";
import { useFormContext } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBookBible,
    faBookOpen,
    faChevronDown,
    faNoteSticky,
    faUserCheck,
    faUserClock,
    faUserPlus,
    faUsers,
    faUserXmark,
    faSackDollar,
    faPlane,
    faUsersRectangle,
} from "@fortawesome/free-solid-svg-icons";

const AcordeaoItem = ({
    titulo,
    icone,
    total,
    listaAlunos,
    secaoId,
    secaoAberta,
    setSecaoAberta,
}: any) => {
    const isOpen = secaoAberta === secaoId;

    return (
        <div className="resumo-chamada__acordeao-item">
            <div
                className="resumo-chamada__item-header"
                onClick={() => setSecaoAberta(isOpen ? null : secaoId)}
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
                            listaAlunos.map((aluno: any) => (
                                <li key={aluno.alunoId}>{aluno.alunoNome}</li>
                            ))
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
};

const InfoLinha = ({
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

function ResumoChamada({
    matriculados,
    visitas_lista,
}: {
    matriculados: MatriculasInterface[];
    visitas_lista: VisitaFront[];
}) {
    const [secaoAberta, setSecaoAberta] = useState<string | null>(null);
    const { watch, setValue } = useFormContext();

    const formValues = watch();
    const {
        chamada,
        ofertaDinheiro,
        visitas,
        ofertaPix,
        missoesDinheiro,
        missoesPix,
        descricao,
        totalBiblias,
        totalLicoes,
        totalMatriculados,
    } = formValues;

    const dadosProcessados = useMemo(() => {
        const matriculadosMap = new Map(
            matriculados.map((m) => [m.alunoId, m])
        );

        const presentes: MatriculasInterface[] = [];
        const atrasados: MatriculasInterface[] = [];
        const ausentes: MatriculasInterface[] = [];

        if (chamada) {
            for (const alunoId in chamada) {
                const status = chamada[alunoId];
                const aluno = matriculadosMap.get(alunoId);
                if (aluno)
                    if (status === "Presente") presentes.push(aluno);
                    else if (status === "Atrasado") atrasados.push(aluno);
                    else if (
                        status === "Falta" ||
                        status === "Falta Justificada"
                    )
                        ausentes.push(aluno);
            }
        }

        return { presentes, atrasados, ausentes };
    }, [chamada, matriculados]);

    useEffect(() => {
        const totalPresentesCalc = dadosProcessados.presentes.length;
        const totalAtrasadosCalc = dadosProcessados.atrasados.length;
        const totalAusentesCalc = dadosProcessados.ausentes.length;

        setValue("totalPresentes", totalPresentesCalc);
        setValue("totalAtrasados", totalAtrasadosCalc);
        setValue("totalAusentes", totalAusentesCalc);
        setValue("totalMatriculados", matriculados.length);
    }, [dadosProcessados, setValue]);

    const totalPresentes = dadosProcessados.presentes.length;
    const totalAtrasados = dadosProcessados.atrasados.length;
    const totalAusentes = dadosProcessados.ausentes.length;
    const totalDePessoas = totalPresentes + totalAtrasados + (visitas || 0);
    const totalOfertas = (ofertaDinheiro || 0) + (ofertaPix || 0);
    const totalMissoes = (missoesDinheiro || 0) + (missoesPix || 0);

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="resumo-chamada"
        >
            <h2 className="resumo-chamada__titulo">Resumo da Chamada</h2>

            <div className="resumo-chamada__card">
                <h3>Resumo de Presença</h3>
                <InfoLinha
                    icon={faUsersRectangle}
                    label="Matriculados"
                    value={totalMatriculados}
                />
                <AcordeaoItem
                    titulo="Presentes"
                    icone={faUserCheck}
                    total={totalPresentes}
                    listaAlunos={dadosProcessados.presentes}
                    secaoId="presentes"
                    secaoAberta={secaoAberta}
                    setSecaoAberta={setSecaoAberta}
                />
                <AcordeaoItem
                    titulo="Atrasados"
                    icone={faUserClock}
                    total={totalAtrasados}
                    listaAlunos={dadosProcessados.atrasados}
                    secaoId="atrasados"
                    secaoAberta={secaoAberta}
                    setSecaoAberta={setSecaoAberta}
                />
                <AcordeaoItem
                    titulo="Ausentes"
                    icone={faUserXmark}
                    total={totalAusentes}
                    listaAlunos={dadosProcessados.ausentes}
                    secaoId="ausentes"
                    secaoAberta={secaoAberta}
                    setSecaoAberta={setSecaoAberta}
                />
                <AcordeaoItem
                    icone={faUserPlus}
                    titulo="Visitas"
                    total={visitas}
                    listaAlunos={visitas_lista.map((v) => ({
                        alunoId: Date.now(),
                        alunoNome: v.nome_completo,
                    }))}
                    secaoId="visitas"
                    secaoAberta={secaoAberta}
                    setSecaoAberta={setSecaoAberta}
                />
                <InfoLinha
                    icon={faUsers}
                    label="TOTAL DE PESSOAS"
                    value={totalDePessoas}
                    isTotal
                />
            </div>

            <div className="resumo-chamada__card">
                <h3>Dados Gerais</h3>
                <InfoLinha
                    icon={faBookBible}
                    label="Bíblias"
                    value={totalBiblias || 0}
                />
                <InfoLinha
                    icon={faBookOpen}
                    label="Revistas"
                    value={totalLicoes || 0}
                />
                <hr />
                <InfoLinha
                    icon={faSackDollar}
                    label="Total Ofertas"
                    value={totalOfertas.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                    })}
                />
                <InfoLinha
                    icon={faPlane}
                    label="Total Missões"
                    value={totalMissoes.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                    })}
                />
                <hr />
                <InfoLinha
                    icon={faNoteSticky}
                    label="Observações"
                    value={descricao || "Nenhuma"}
                />
            </div>
        </motion.div>
    );
}

export default ResumoChamada;
