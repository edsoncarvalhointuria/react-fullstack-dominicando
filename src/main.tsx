import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";
import App from "./App.tsx";
import AuthContext from "./context/AuthContext.tsx";
import { BrowserRouter } from "react-router-dom";
import DataContext from "./context/DataContext.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <AuthContext>
                <DataContext>
                    <App />
                </DataContext>
            </AuthContext>
        </BrowserRouter>
    </StrictMode>
);
