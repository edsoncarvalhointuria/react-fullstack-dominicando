import { useFormContext } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTimes } from "@fortawesome/free-solid-svg-icons";
import { useEffect } from "react";

function DadosGeraisChamada({
    setAddVisita,
    visitas,
    setVisitas,
}: {
    setAddVisita: (v: boolean) => void;
    setVisitas: React.Dispatch<React.SetStateAction<VisitaFront[]>>;
    visitas: VisitaFront[];
}) {
    const { register, setValue, watch } = useFormContext();
    const totalVisitas = watch("visitas");

    useEffect(() => {
        setValue("visitasLista", visitas);
    }, [visitas]);
    return (
        <motion.div
            className="dados-gerais-chamada"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
        >
            <div className="form-group-visitas">
                <label htmlFor="visitas">Visitas</label>

                <div className="input-group">
                    <input
                        type="number"
                        id="visitas"
                        {...register("visitas", {
                            valueAsNumber: true,
                            onBlur: (v) => {
                                if (!v.target?.value) setValue("visitas", 0);
                                else if (v.target?.value < visitas.length)
                                    setValue("visitas", visitas.length);
                            },
                        })}
                    />

                    <button
                        className="chamada-page__filtro__button-new"
                        type="button"
                        onClick={() => setAddVisita(true)}
                    >
                        <FontAwesomeIcon
                            className="chamada-page__filtro__add-new"
                            icon={faPlus}
                        />

                        <span>Adicionar Visita</span>
                    </button>
                </div>

                <AnimatePresence>
                    {visitas.length > 0 && (
                        <motion.div
                            className="lista-visitantes-adicionados"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                        >
                            <h4>Visitantes Adicionados:</h4>
                            <ul>
                                {visitas.map((v, i) => (
                                    <li key={i}>
                                        <div className="visitante-info">
                                            <p className="visitante-info__nome">
                                                {v.nome_completo}
                                            </p>
                                            {v.data_nascimento && (
                                                <p className="visitante-info__nascimento">
                                                    {v.data_nascimento}
                                                </p>
                                            )}
                                        </div>
                                        <motion.button
                                            type="button"
                                            className="visitante-info__remover-btn"
                                            onTap={() => {
                                                setVisitas((visita) => [
                                                    ...visita.filter(
                                                        (vis) =>
                                                            vis.nome_completo !==
                                                            v.nome_completo
                                                    ),
                                                ]);
                                                setValue(
                                                    "visitas",
                                                    totalVisitas - 1
                                                );
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faTimes} />
                                        </motion.button>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div className="form-group">
                <label htmlFor="visitas">Total Bíblias</label>
                <input
                    type="number"
                    id="biblias"
                    {...register("totalBiblias", {
                        valueAsNumber: true,
                    })}
                />
            </div>
            <div className="form-group">
                <label htmlFor="visitas">Total Revistas</label>
                <input
                    type="number"
                    id="revistas"
                    {...register("totalLicoes", {
                        valueAsNumber: true,
                    })}
                />
            </div>

            <h4>Ofertas</h4>
            <div className="form-group">
                <label htmlFor="ofertaDinheiro">Dinheiro</label>
                <input
                    type="number"
                    id="ofertaDinheiro"
                    {...register("ofertaDinheiro", {
                        valueAsNumber: true,
                    })}
                />
            </div>
            <div className="form-group">
                <label htmlFor="ofertaPix">PIX</label>
                <input
                    type="number"
                    id="ofertaPix"
                    {...register("ofertaPix", { valueAsNumber: true })}
                />
            </div>

            <h4>Missões</h4>
            <div className="form-group">
                <label htmlFor="missoesDinheiro">Dinheiro</label>
                <input
                    type="number"
                    id="missoesDinheiro"
                    {...register("missoesDinheiro", { valueAsNumber: true })}
                />
            </div>
            <div className="form-group">
                <label htmlFor="missoesPix">PIX</label>
                <input
                    type="number"
                    id="missoesPix"
                    {...register("missoesPix", { valueAsNumber: true })}
                />
            </div>

            <div className="form-group">
                <label htmlFor="descricao">Descrição (Opcional)</label>
                <textarea id="descricao" {...register("descricao")} />
            </div>
        </motion.div>
    );
}

export default DadosGeraisChamada;
