import { Timestamp } from "firebase/firestore";

export const getPeriodo = (dataInicio: Timestamp) => {
    let data = dataInicio;
    if (typeof data === "object")
        data = new Timestamp(data.seconds, data.nanoseconds);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataAlvo = data.toDate();
    dataAlvo.setHours(0, 0, 0, 0);
    dataAlvo.setFullYear(hoje.getFullYear());

    const diferenca = Math.floor(dataAlvo.getTime() - hoje.getTime());
    const umDia = 1000 * 60 * 60 * 24;

    if (diferenca === 0) return "hoje";
    if (diferenca === umDia) return "amanhã";
    return dataAlvo.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
    });
};
