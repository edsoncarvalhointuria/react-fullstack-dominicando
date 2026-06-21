import "./vazio-default.scss";
export default function VazioDefault({ mensagem }: { mensagem: string }) {
    return (
        <div className="vazio-default">
            <p className="vazio-default--mensagem">{mensagem}</p>
        </div>
    );
}
