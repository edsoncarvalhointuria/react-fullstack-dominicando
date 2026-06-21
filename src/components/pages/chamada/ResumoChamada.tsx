import { motion } from "framer-motion";
import type { MatriculasInterface } from "../../../interfaces/MatriculasInterface";
import { useFormContext, useWatch } from "react-hook-form";
import { useEffect, useMemo } from "react";
import {
    faBookBible,
    faBookOpen,
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
import { AcordeaoItem, InfoLinha } from "./ChamadaItens";
import "./resumo-chamada.scss";

function ResumoChamada({
    matriculados,
    visitas_lista,
}: {
    matriculados: MatriculasInterface[];
    visitas_lista: VisitaFront[];
}) {
    const { setValue, getValues, control } = useFormContext();
    const ofertaPix = useWatch({ name: "ofertaPix", control });
    const ofertaDinheiro = useWatch({ name: "ofertaDinheiro", control });
    const missoesPix = useWatch({ name: "missoesPix", control });
    const missoesDinheiro = useWatch({ name: "missoesDinheiro", control });

    const totalMatriculados = useWatch({ name: "totalMatriculados", control });

    const dadosProcessados = useMemo(() => {
        const matriculadosMap = new Map(
            matriculados.map((m) => [m.alunoId, m]),
        );

        const presentes: MatriculasInterface[] = [];
        const atrasados: MatriculasInterface[] = [];
        const ausentes: MatriculasInterface[] = [];
        const chamada = getValues("chamada");

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
    }, [matriculados]);

    useEffect(() => {
        const totalPresentesCalc = dadosProcessados.presentes.length;
        const totalAtrasadosCalc = dadosProcessados.atrasados.length;
        const totalAusentesCalc = dadosProcessados.ausentes.length;
        const mDinheiro = getValues("missoesDinheiro");
        const mPix = getValues("missoesPix");
        const oDinheiro = getValues("ofertaDinheiro");
        const oPix = getValues("ofertaPix");

        setValue("totalPresentes", totalPresentesCalc);
        setValue("totalAtrasados", totalAtrasadosCalc);
        setValue("totalAusentes", totalAusentesCalc);
        setValue("totalMatriculados", matriculados.length);
        setValue(
            "ofertaDinheiro",
            Number(
                typeof oDinheiro === "string"
                    ? oDinheiro.replace(",", ".")
                    : oDinheiro,
            ),
        );
        setValue(
            "ofertaPix",
            Number(typeof oPix === "string" ? oPix.replace(",", ".") : oPix),
        );
        setValue(
            "missoesDinheiro",
            Number(
                typeof mDinheiro === "string"
                    ? mDinheiro.replace(",", ".")
                    : mDinheiro,
            ),
        );
        setValue(
            "missoesPix",
            Number(typeof mPix === "string" ? mPix.replace(",", ".") : mPix),
        );
    }, [dadosProcessados, setValue]);

    const visitas = getValues("visitas");
    const totalPresentes = dadosProcessados.presentes.length;
    const totalAtrasados = dadosProcessados.atrasados.length;
    const totalAusentes = dadosProcessados.ausentes.length;
    const totalDePessoas = totalPresentes + totalAtrasados + (visitas || 0);
    const totalOfertas = (ofertaDinheiro || 0) + (ofertaPix || 0);
    const totalMissoes = (missoesDinheiro || 0) + (missoesPix || 0);
    const totalBiblias = getValues("totalBiblias");
    const totalLicoes = getValues("totalLicoes");
    const descricao = getValues("descricao");

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
                />
                <AcordeaoItem
                    titulo="Atrasados"
                    icone={faUserClock}
                    total={totalAtrasados}
                    listaAlunos={dadosProcessados.atrasados}
                />
                <AcordeaoItem
                    titulo="Ausentes"
                    icone={faUserXmark}
                    total={totalAusentes}
                    listaAlunos={dadosProcessados.ausentes}
                />
                <AcordeaoItem
                    icone={faUserPlus}
                    titulo="Visitas"
                    total={visitas}
                    listaAlunos={visitas_lista.map(
                        (v) =>
                            ({
                                alunoId: Date.now(),
                                alunoNome: v.nome_completo,
                            }) as any,
                    )}
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
