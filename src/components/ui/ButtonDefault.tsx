import { faFileCsv, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ReactNode } from "react";
import "./buttons-default.scss";

export default function ButtonsDefault({
    onClickNew,
    icon,
    onClickCsv,
    disabled,
    mensagem,
    children,
    animationIcon = true,
}: {
    onClickNew: (confirm: true) => void;
    icon?: ReactNode;
    onClickCsv?: (v: true) => void;
    mensagem: string;
    disabled?: boolean;
    children?: ReactNode;
    animationIcon?: boolean;
}) {
    return (
        <div className="buttons-default">
            <button
                title={mensagem}
                onClick={() => onClickNew(true)}
                className="buttons-default--cadastro"
                disabled={disabled}
            >
                <span className={animationIcon ? "buttons-default--cadastro--animation" : undefined}>
                    {icon ? icon : <FontAwesomeIcon icon={faPlus} />}
                </span>
                {mensagem}
            </button>

            {onClickCsv ? (
                <button title="Importar CSV" className="buttons-default--csv" onClick={() => onClickCsv(true)}>
                    <span>
                        <FontAwesomeIcon icon={faFileCsv} />
                    </span>
                    Importar CSV
                </button>
            ) : (
                children
            )}
        </div>
    );
}
