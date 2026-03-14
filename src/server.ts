import express from "express"
import swaggerUi from "swagger-ui-express"
import { ENV } from "./config/env"
import routes from "./routes"
import { errorHandler } from "./interfaces/http/middleware/error.middleware"
import { openApiSpec } from "./openapi"
import { prisma } from "./infra/db/prisma"
import { redisConnection } from "./infra/redis/client"
import { jobQueue } from "./infra/queue/queue"
import { logger } from "./utils/logger"

process.on("SIGINT", async () => {
  logger.info("Shutting down...")
  await prisma.$disconnect()
  await jobQueue.close()
  await redisConnection.quit()
  process.exit(0)
})

const app = express()
app.use(express.json())

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec))

app.get("/health", (_, res) => {
  res.json({ status: "ok" })
})

app.use("/api/v1", routes)

// Error handler last so it catches errors from routes
app.use(errorHandler)

app.listen(ENV.PORT, () => {
  console.log("Server running on", ENV.PORT)
})


