const UPDATE_MESSAGE =
  "Доступне оновлення F1 Calendar. Оновити застосунок зараз?";

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });

        const offerUpdate = () => {
          if (registration.waiting && window.confirm(UPDATE_MESSAGE))
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
        };

        if (registration.waiting && navigator.serviceWorker.controller)
          offerUpdate();
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            )
              offerUpdate();
          });
        });
      })
      .catch(() => {
        // The online application remains usable when a browser blocks service workers.
      });
  });
}
