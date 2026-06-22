import { localStorageObj } from "../data/localStorageObj";
import { limparLocalStorage } from "./adicionarIdsLocalStorage";

export const limparCache = async () => {
    try {
        limparLocalStorage();
        if ("caches" in window) {
            const names = await caches.keys();
            await Promise.all(names.map((n) => caches.delete(n)));
        }

        if ("serviceWorker" in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) await reg.unregister();
        }

        localStorage.setItem("chace-v1", "true");

        Object.keys(localStorage).forEach((v) => v.startsWith("sistema_") && localStorage.removeItem(v));
        Object.values(localStorageObj).forEach((v) => localStorage.removeItem(v));
        setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
        console.error("Erro ao limpar cache:", err);
    }
};
