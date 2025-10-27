export const limparCache = async () => {
    try {
        if ("caches" in window) {
            const names = await caches.keys();
            await Promise.all(names.map((n) => caches.delete(n)));
        }

        if ("serviceWorker" in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) await reg.unregister();
        }

        localStorage.setItem("chace-v1", "true");

        setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
        console.error("Erro ao limpar cache:", err);
    }
};
