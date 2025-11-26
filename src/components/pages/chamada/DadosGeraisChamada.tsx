import { useFormContext } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFileImage,
    faPlus,
    faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useState } from "react";
import { reduzirImagem } from "../../../utils/reduzirImagem";

function DadosGeraisChamada({
    setAddVisita,
    visitas,
    setVisitas,
    setPixMissoes,
    setPixOfertas,
    pixOfertas,
    pixMissoes,
}: {
    setAddVisita: (v: boolean) => void;
    setVisitas: React.Dispatch<React.SetStateAction<VisitaFront[]>>;
    visitas: VisitaFront[];
    setPixOfertas: React.Dispatch<React.SetStateAction<File[]>>;
    setPixMissoes: React.Dispatch<React.SetStateAction<File[]>>;
    pixOfertas: File[];
    pixMissoes: File[];
}) {
    const [showErro, setShowErro] = useState(false);
    const { register, setValue, watch } = useFormContext();
    const totalVisitas = watch("visitas");
    const { imgsPixOfertas, imgsPixMissoes, chamada, totalLicoes } = watch();

    const presentes = Object.values(chamada || {}).filter(
        (v) => v === "Presente" || v === "Atrasado"
    ).length;

    const editarNumero = (evt: any, campo: string) => {
        let value = (evt.target.value || "0").replace(",", ".");

        if (!Number.isNaN(value))
            setValue(campo, Number(value) < 0 ? 0 : Number(value));
        else {
            value = value.replace(".", ".0");

            if (!Number.isNaN(value)) setValue(campo, Number(value));
            else setValue(campo, 0);
        }
    };

    useEffect(() => {
        setValue("visitasLista", visitas);
    }, [visitas]);
    useEffect(() => {
        if (totalLicoes > presentes) setValue("totalLicoes", presentes);
    }, []);
    return (
        <motion.div
            className="dados-gerais-chamada"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
        >
            <div className="form-group-lista">
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
                <label htmlFor="biblias">Total Bíblias</label>
                <input
                    type="number"
                    step={1}
                    id="biblias"
                    {...register("totalBiblias", {
                        valueAsNumber: true,
                        onBlur: (evt) => {
                            const v = Math.floor(evt.target.value);

                            if (v < 0) setValue("totalBiblias", 0);
                            else setValue("totalBiblias", v || 0);
                        },
                    })}
                />
            </div>
            <div className="form-group">
                <label htmlFor="revistas">Total Revistas</label>
                <input
                    type="number"
                    id="revistas"
                    step={1}
                    {...register("totalLicoes", {
                        valueAsNumber: true,
                        maxLength: presentes,
                        onBlur: (evt) => {
                            const v = Math.floor(evt.target.value);

                            if (v < 0) setValue("totalLicoes", 0);
                            else if (v > presentes) {
                                setValue("totalLicoes", presentes);
                                setShowErro(true);

                                setTimeout(() => setShowErro(false), 9000);
                            } else setValue("totalLicoes", v || 0);
                        },
                    })}
                />
                <AnimatePresence>
                    {showErro && (
                        <motion.p
                            className="form-group--erro"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            key={"erro-mensagem"}
                        >
                            <span>(Valor corrigido)</span> Você não pode
                            contabilizar mais revistas do que alunos presentes (
                            {presentes}).
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>

            <h4>Ofertas</h4>
            <div className="form-group">
                <label htmlFor="ofertaDinheiro">Dinheiro</label>
                <input
                    type="number"
                    id="ofertaDinheiro"
                    {...register("ofertaDinheiro", {
                        onBlur: (evt) => editarNumero(evt, "ofertaDinheiro"),
                    })}
                />
            </div>
            <div className="form-group-lista">
                <label htmlFor="ofertaPix" className="label-simple">
                    PIX
                </label>
                <div className="input-group">
                    <input
                        type="number"
                        id="ofertaPix"
                        {...register("ofertaPix", {
                            onBlur: (evt) => editarNumero(evt, "ofertaPix"),
                        })}
                    />
                    <button
                        className="chamada-page__filtro__button-new"
                        type="button"
                    >
                        <FontAwesomeIcon icon={faFileImage} />

                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(v) => {
                                const files = v.target.files;

                                if (files)
                                    Promise.all(
                                        Array.from(files).map((v) =>
                                            reduzirImagem(v, 700, 700)
                                        )
                                    ).then((v) => setPixOfertas(v));
                            }}
                        />

                        <span>Comprovante PIX</span>
                    </button>
                </div>

                <AnimatePresence>
                    {(imgsPixOfertas?.length > 0 || pixOfertas?.length > 0) && (
                        <motion.div
                            className="lista-visitantes-adicionados"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                        >
                            <h4>Comprovantes Adicionados:</h4>
                            <ul>
                                {pixOfertas?.map((v, i) => (
                                    <li key={i}>
                                        <div className="visitante-info">
                                            <p className="visitante-info__nome">
                                                {v.name}
                                            </p>
                                        </div>
                                        <motion.button
                                            type="button"
                                            className="visitante-info__remover-btn"
                                            onTap={() =>
                                                setPixOfertas((v) =>
                                                    v.filter(
                                                        (_, ind) => ind !== i
                                                    )
                                                )
                                            }
                                        >
                                            <FontAwesomeIcon icon={faTimes} />
                                        </motion.button>
                                    </li>
                                ))}

                                {imgsPixOfertas?.map((v: any, i: any) => {
                                    const url = new URL(v);
                                    const path = decodeURIComponent(
                                        url.pathname
                                    );
                                    const nome = path.substring(
                                        path.lastIndexOf("/") + 1
                                    );

                                    return (
                                        <li key={i}>
                                            <div className="visitante-info">
                                                <p className="visitante-info__nome">
                                                    {nome}
                                                </p>
                                            </div>
                                            <motion.button
                                                type="button"
                                                className="visitante-info__remover-btn"
                                                onTap={() =>
                                                    setValue(
                                                        "imgsPixOfertas",
                                                        imgsPixOfertas.filter(
                                                            (
                                                                _: any,
                                                                ind: any
                                                            ) => ind !== i
                                                        )
                                                    )
                                                }
                                            >
                                                <FontAwesomeIcon
                                                    icon={faTimes}
                                                />
                                            </motion.button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <h4>Missões</h4>
            <div className="form-group">
                <label htmlFor="missoesDinheiro">Dinheiro</label>
                <input
                    type="number"
                    id="missoesDinheiro"
                    {...register("missoesDinheiro", {
                        onBlur: (evt) => editarNumero(evt, "missoesDinheiro"),
                    })}
                />
            </div>

            <div className="form-group-lista">
                <label htmlFor="missoesPix" className="label-simple">
                    PIX
                </label>
                <div className="input-group">
                    <input
                        type="number"
                        id="missoesPix"
                        {...register("missoesPix", {
                            onBlur: (evt) => editarNumero(evt, "missoesPix"),
                        })}
                    />
                    <button
                        className="chamada-page__filtro__button-new"
                        type="button"
                    >
                        <FontAwesomeIcon icon={faFileImage} />

                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(v) => {
                                const files = v.target.files;
                                if (files)
                                    Promise.all(
                                        Array.from(files).map((v) =>
                                            reduzirImagem(v, 700, 700)
                                        )
                                    ).then((v) => setPixMissoes(v));
                            }}
                        />

                        <span>Comprovante PIX</span>
                    </button>
                </div>

                <AnimatePresence>
                    {(imgsPixMissoes?.length > 0 || pixMissoes?.length > 0) && (
                        <motion.div
                            className="lista-visitantes-adicionados"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                        >
                            <h4>Comprovantes Adicionados:</h4>
                            <ul>
                                {pixMissoes?.map((v, i) => (
                                    <li key={i}>
                                        <div className="visitante-info">
                                            <p className="visitante-info__nome">
                                                {v.name}
                                            </p>
                                        </div>
                                        <motion.button
                                            type="button"
                                            className="visitante-info__remover-btn"
                                            onTap={() =>
                                                setPixMissoes((v) =>
                                                    v.filter(
                                                        (_, ind) => ind !== i
                                                    )
                                                )
                                            }
                                        >
                                            <FontAwesomeIcon icon={faTimes} />
                                        </motion.button>
                                    </li>
                                ))}
                                {imgsPixMissoes?.map((v: any, i: any) => {
                                    const url = new URL(v);
                                    const path = decodeURIComponent(
                                        url.pathname
                                    );
                                    const nome = path.substring(
                                        path.lastIndexOf("/") + 1
                                    );
                                    return (
                                        <li key={i}>
                                            <div className="visitante-info">
                                                <p className="visitante-info__nome">
                                                    {nome}
                                                </p>
                                            </div>
                                            <motion.button
                                                type="button"
                                                className="visitante-info__remover-btn"
                                                onTap={() =>
                                                    setValue(
                                                        "imgsPixMissoes",
                                                        imgsPixMissoes.filter(
                                                            (
                                                                _: any,
                                                                ind: any
                                                            ) => ind !== i
                                                        )
                                                    )
                                                }
                                            >
                                                <FontAwesomeIcon
                                                    icon={faTimes}
                                                />
                                            </motion.button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="form-group">
                <label htmlFor="descricao">Descrição (Opcional)</label>
                <textarea id="descricao" {...register("descricao")} />
            </div>
        </motion.div>
    );
}

export default DadosGeraisChamada;
