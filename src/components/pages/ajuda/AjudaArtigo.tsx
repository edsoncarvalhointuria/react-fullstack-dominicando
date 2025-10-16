import { Link, Navigate, useParams } from "react-router-dom";
import "./ajuda-artigo.scss";
import { dadosAjuda } from "../../../data/ajuda";
import Markdown from "react-markdown";
import { faDesktop, faMobileButton } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import remarkGfm from "remark-gfm";

function AjudaArtigo() {
    const [currentVideo, setCurrentVideo] = useState<
        "videoMobile" | "videoDesktop" | null
    >(null);
    const { ajudaId } = useParams();
    const artigo = dadosAjuda.find((v) => v.id === ajudaId);

    if (!ajudaId || !artigo) return <Navigate to={"/ajuda"} />;

    useEffect(() => {
        if (artigo.videoMobile) setCurrentVideo("videoMobile");
        else if (artigo.videoDesktop) setCurrentVideo("videoDesktop");
        else setCurrentVideo(null);
    }, [artigo]);
    return (
        <div className="ajuda-artigo">
            <h1 className="ajuda-artigo__titulo">{artigo.titulo}</h1>
            <div className="ajuda-artigo__conteudo">
                <Markdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        a: ({ href, children, ...props }) => {
                            return (
                                <Link to={href || ""} {...props}>
                                    {children}
                                </Link>
                            );
                        },
                    }}
                >
                    {artigo.conteudo}
                </Markdown>
            </div>
            {currentVideo && (
                <div className="ajuda-artigo__videos">
                    <h2>Demonstração em vídeo</h2>
                    <div className="ajuda-artigo__videos-container">
                        <div
                            className={`ajuda-artigo__videos--dispositivos ${currentVideo}`}
                        >
                            {artigo.videoMobile && (
                                <div
                                    className="ajuda-artigo__videos--dispositivo"
                                    onClick={() =>
                                        setCurrentVideo("videoMobile")
                                    }
                                >
                                    <FontAwesomeIcon icon={faMobileButton} />
                                </div>
                            )}
                            {artigo.videoDesktop && (
                                <div
                                    className="ajuda-artigo__videos--dispositivo"
                                    onClick={() =>
                                        setCurrentVideo("videoDesktop")
                                    }
                                >
                                    <FontAwesomeIcon icon={faDesktop} />
                                </div>
                            )}
                        </div>

                        <div className="ajuda-artigo__videos--video">
                            <iframe
                                onClick={(v) => v.currentTarget.blur()}
                                width="560"
                                height="315"
                                src={artigo[currentVideo]}
                                title="YouTube video player"
                                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                                aria-hidden={false}
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AjudaArtigo;
