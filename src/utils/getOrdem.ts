export const getOrdem = (a: any, b: any, ordemColuna: any, ordem: any) => {
    const itemA = a[ordemColuna];
    const itemB = b[ordemColuna];

    if (typeof itemA === "number" && typeof itemB === "number") {
        return ordem === "crescente" ? itemA - itemB : itemB - itemA;
    }

    if (
        typeof itemA?.toDate === "function" &&
        typeof itemB?.toDate === "function"
    ) {
        return ordem === "crescente"
            ? itemA.toDate() - itemB.toDate()
            : itemB.toDate() - itemA.toDate();
    }

    if (typeof itemA === "boolean") {
        if (itemA === true) return ordem === "crescente" ? -1 : 1;
        else return ordem === "crescente" ? 1 : -1;
    }
    if (typeof itemB === "boolean") {
        if (itemB === true) return ordem === "crescente" ? 1 : -1;
        else return ordem === "crescente" ? -1 : 1;
    }

    if (!itemA) return 1;
    if (!itemB) return -1;

    return ordem === "crescente"
        ? itemA.localeCompare(itemB)
        : itemB.localeCompare(itemA);
};
