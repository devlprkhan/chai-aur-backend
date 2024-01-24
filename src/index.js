import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";
dotenv.config({
  path: './.env'
})
const PORT = process.env.PORT || 3000

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on * http://localhost:${PORT}`);
    })
  })
  .catch((err) => { console.error("MONGO DB Connection Error: ", err) })