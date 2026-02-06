export const getOrdem = (a: any, b: any, ordemColuna: any, ordem: any) => {
    const itemA = a[ordemColuna];
    const itemB = b[ordemColuna];

    if (typeof itemA === "number" && typeof itemB === "number") {
        return ordem === "crescente" ? itemA - itemB : itemB - itemA;
    }

    if (
        typeof itemA?.toDate === "function" &&
        typeof itemA?.toDate === "function"
    ) {
        return ordem === "crescente"
            ? itemA.toDate() - itemB.toDate()
            : itemB.toDate() - itemA.toDate();
    }

    if (!itemA) return 1;
    if (!itemB) return -1;

    return ordem === "crescente"
        ? itemA.localeCompare(itemB)
        : itemB.localeCompare(itemA);
};
