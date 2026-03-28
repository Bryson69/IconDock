import compression from "compression";
import cors from "cors";
import express from "express";
import { createCorsOptions } from "./corsOptions.js";
import { iconsRouter } from "./routes/icons.js";
import { webflowOAuthRouter } from "./routes/oauthWebflow.js";

const app = express();
app.disable("x-powered-by");
app.use(compression());
app.use(cors(createCorsOptions()));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/oauth/webflow", webflowOAuthRouter);
app.use("/api/icons", iconsRouter);

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[IconDock] backend listening on :${port}`);
});

