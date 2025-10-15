import { useEffect, useMemo, useState } from "react";
import "./ajuda.scss";
import SearchInput from "../../ui/SearchInput";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCaretLeft,
    faCaretRight,
    faNewspaper,
} from "@fortawesome/free-solid-svg-icons";
import { dadosAjuda } from "../../../data/ajuda";
import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import { Link } from "react-router-dom";

const variantsContainer: Variants = {
    initial: {},
    animate: { transition: { delayChildren: stagger(0.1) } },
    exit: { transition: { delayChildren: stagger(0.1) } },
};

const variantsItem: Variants = {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
};

const AjudaItem = ({
    title,
    desc,
    link,
}: {
    title: string;
    desc: string;
    link: string;
}) => {
    return (
        <motion.div className="ajuda-item" variants={variantsItem}>
            <Link to={link}>
                <div className="ajuda-item__icon">
                    <FontAwesomeIcon icon={faNewspaper} />
                </div>

                <div className="ajuda-item__infos">
                    <div className="ajuda-item__title">
                        <h3>{title}</h3>
                    </div>

                    <div className="ajuda-item__desc">
                        <p>
                            {desc
                                .replace(/#+\s/g, "")
                                .replace(/\*./g, "")
                                .slice(0, 150)}
                            ...
                        </p>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
};

function Ajuda() {
    const LIMITE_ARTIGOS = 8;
    const [pesquisa, setPesquisa] = useState("");
    const [page, setPage] = useState(0);

    const artigosAJudaMemo = useMemo(() => {
        let a = dadosAjuda;

        if (!pesquisa) return a;

        const palavras = pesquisa.split(" ").filter((v) => /^\p{L}+$/u.test(v));

        a = a
            .filter((v) => {
                const isTitle = palavras
                    .map((p) =>
                        v.titulo
                            .toLocaleLowerCase()
                            .includes(p.toLocaleLowerCase())
                    )
                    .reduce((prev, current) => prev && current, true);

                const isConteudo = palavras
                    .map((p) =>
                        v.conteudo
                            .toLocaleLowerCase()
                            .includes(p.toLocaleLowerCase())
                    )
                    .reduce((prev, current) => prev && current, true);

                return isTitle || isConteudo;
            })
            .sort((a, b) => {
                const calc = (artigo: any) => {
                    const score = palavras
                        .map((v) => {
                            const isTitle = artigo.titulo
                                .toLocaleLowerCase()
                                .includes(v.toLocaleLowerCase());
                            const isConteudo = artigo.conteudo
                                .toLocaleLowerCase()
                                .includes(v.toLocaleLowerCase());
                            let n = 0;
                            if (isTitle) n += 2;
                            if (isConteudo) n += 1;

                            return n;
                        })
                        .reduce((prev, current) => prev + current, 0);

                    return score;
                };

                return calc(b) - calc(a);
            });

        return a;
    }, [dadosAjuda, pesquisa]);

    const artigosAJudaPageMemo = useMemo(
        () =>
            artigosAJudaMemo.slice(
                page * LIMITE_ARTIGOS,
                page * LIMITE_ARTIGOS + LIMITE_ARTIGOS
            ),
        [artigosAJudaMemo, page]
    );

    const totalPaginasMemo = useMemo(
        () => Math.ceil(artigosAJudaMemo.length / LIMITE_ARTIGOS),
        [artigosAJudaMemo]
    );

    const proximaPagina = () => {
        setPage((v) => (v + 1) % totalPaginasMemo);
    };
    const paginaAnterior = () => {
        setPage((v) => (v - 1 + totalPaginasMemo) % totalPaginasMemo);
    };

    useEffect(() => {
        setPage(0);
    }, [pesquisa]);

    return (
        <div className="ajuda-page">
            <div className="ajuda-page__header">
                <div className="ajuda-page__pesquisa">
                    <h2>Como podemos te ajudar?</h2>
                    <SearchInput onSearch={setPesquisa} texto="Artigo" />
                </div>
            </div>

            <div className="ajuda-page__body">
                <motion.div
                    className="ajuda-page__itens"
                    layout
                    variants={variantsContainer}
                    initial={"initial"}
                    exit={"exit"}
                    animate={"animate"}
                >
                    <AnimatePresence>
                        {artigosAJudaPageMemo.length > 0 ? (
                            artigosAJudaPageMemo.map((v, i) => (
                                <AjudaItem
                                    desc={v.conteudo}
                                    title={v.titulo}
                                    link={v.id}
                                    key={"item-" + i}
                                />
                            ))
                        ) : (
                            <div className="ajuda-page__itens--vazio">
                                <p>Nenhum artigo foi encontrado.</p>
                                <p>
                                    Tente pesquisar novamente usando termos mais
                                    genéricos ou semelhantes.
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {totalPaginasMemo > 1 && (
                    <div className="ajuda-page__paginacao">
                        <motion.button
                            title="Página Anterior"
                            className="ajuda-page__paginacao--arrow"
                            onTap={paginaAnterior}
                        >
                            <FontAwesomeIcon icon={faCaretLeft} />
                        </motion.button>
                        <motion.div
                            className="ajuda-page__paginacao--page"
                            layout
                        >
                            {page - 1 >= 0 && (
                                <p className="ajuda-page__paginacao--page-anterior">
                                    {page}
                                </p>
                            )}
                            <p className="ajuda-page__paginacao--page-atual">
                                {page + 1}
                            </p>
                            {page + 1 < totalPaginasMemo && (
                                <p className="ajuda-page__paginacao--page-proximo">
                                    {page + 2}
                                </p>
                            )}
                        </motion.div>
                        <motion.button
                            title="Próxima Página"
                            className="ajuda-page__paginacao--arrow"
                            onTap={proximaPagina}
                        >
                            <FontAwesomeIcon icon={faCaretRight} />
                        </motion.button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Ajuda;
