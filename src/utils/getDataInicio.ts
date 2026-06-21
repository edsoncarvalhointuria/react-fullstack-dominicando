export default function getDataInicio(trimestre: number) {
    const hoje = new Date();
    const inicioTrimestre = new Date(hoje.getFullYear(), (trimestre - 1) * 3, 1);
    const diaSemana = inicioTrimestre.getDay();
    const domingo = (7 - diaSemana) % 7;
    inicioTrimestre.setDate(inicioTrimestre.getDate() + domingo);

    return inicioTrimestre.toISOString().split("T")[0];
}
