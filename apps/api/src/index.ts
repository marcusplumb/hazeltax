import dotenv from "dotenv";
dotenv.config();

import { createServer } from "./server.js";

const port = Number(process.env.PORT || 4000);
const app = createServer();

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
