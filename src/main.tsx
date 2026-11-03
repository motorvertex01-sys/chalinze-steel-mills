import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SiteConfigProvider } from "./siteConfig";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SiteConfigProvider><App /></SiteConfigProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
