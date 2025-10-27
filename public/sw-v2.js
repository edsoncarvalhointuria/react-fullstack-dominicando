// CONTEÚDO DO SCRIPT "SUICIDA"
// Este script vai se desregistrar e forçar um reload

self.addEventListener("install", (event) => {
    console.log("[SW Suicida] Instalando: Forçando a ativação...");
    // Força este SW a pular a espera e ativar imediatamente
    event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
    console.log("[SW Suicida] Ativando: Desregistrando e limpando...");

    // 1. Desregistra a si mesmo (e qualquer outro SW neste escopo)
    event.waitUntil(
        self.registration
            .unregister()
            .then(() => {
                console.log(
                    "[SW Suicida] Service Worker desregistrado com sucesso."
                );
            })
            .catch((err) => {
                console.error("[SW Suicida] Falha ao desregistrar:", err);
            })
    );

    // 2. Limpa todos os caches antigos (Opcional, mas recomendado)
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    console.log(
                        "[SW Suicida] Deletando cache antigo:",
                        cacheName
                    );
                    return caches.delete(cacheName);
                })
            );
        })
    );

    // 3. Força todas as abas abertas a recarregarem
    event.waitUntil(
        self.clients
            .claim()
            .then(() => {
                return self.clients.matchAll({ type: "window" });
            })
            .then((clients) => {
                clients.forEach((client) => {
                    console.log(
                        "[SW Suicida] Forçando reload da aba:",
                        client.url
                    );
                    // Recarrega a página para que ela busque tudo da rede
                    client.navigate(client.url);
                });
            })
    );
});
