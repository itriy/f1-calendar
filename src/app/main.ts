import { createApp } from "vue";
import App from "./App.vue";
import { i18n, initializeLocale } from "@/shared/config/i18n";
import { registerServiceWorker } from "./providers/service-worker";
import "./styles/index.css";

await initializeLocale();
createApp(App).use(i18n).mount("#app");
registerServiceWorker();
