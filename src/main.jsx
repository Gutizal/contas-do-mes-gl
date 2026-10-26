import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./auth/AuthContext";
import { ConfirmProvider } from "./components/Confirm";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </AuthProvider>
  </StrictMode>
);
