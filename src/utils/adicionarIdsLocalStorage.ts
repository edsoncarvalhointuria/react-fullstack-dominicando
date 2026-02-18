export const adicionarListaLocalStorage = (...args: string[]) => {
    const dadosAtuais = JSON.parse(
        localStorage.getItem("notificacoes_removidas") || "[]",
    );
    const totais = new Set([...dadosAtuais, ...args]);

    localStorage.setItem(
        "notificacoes_removidas",
        JSON.stringify(Array.from(totais)),
    );
};

export const limparLocalStorage = () => {
    localStorage.removeItem("notificacoes_removidas");
    localStorage.removeItem("ultima_pesquisa_notificacoes");
};
