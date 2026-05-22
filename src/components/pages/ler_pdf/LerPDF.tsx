import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./ler-pdf.scss";

function LerPDF({ link }: { link?: string }) {
    const [linkPdf, setLinkPdf] = useState(link || "");
    const location = useLocation();
    const navigate = useNavigate();
    useEffect(() => {
        const { state } = location;
        if (!state && !link) {
            navigate("/dashboard");
            return;
        }
        setLinkPdf(state);
    }, []);
    return (
        <div className="ler-pdf">
            <div className="ler-pdf__container">
                <iframe
                    src={`${linkPdf}#toolbar=0`}
                    width="100%"
                    height="100%"
                    style={{ border: "none", height: "100%" }}
                />
            </div>

            <div className="ler-pdf__back">
                <button
                    title="Voltar"
                    type="button"
                    onClick={() => window.history.back()}
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                </button>
            </div>
        </div>
    );
}

export default LerPDF;
