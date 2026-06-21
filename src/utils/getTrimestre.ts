export default function getTrimestre(data: Date) {
    const trimestre = Math.floor(data.getMonth() / 3) + 1;
    return trimestre;
}
