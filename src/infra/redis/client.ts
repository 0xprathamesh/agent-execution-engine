import Redis from "ioredis"
import { logger } from "../../utils/logger"
import { ENV } from "../../config/env"

const connectionOptions = {
  host: ENV.REDIS_HOST,
  port: Number(ENV.REDIS_PORT),
  password: ENV.REDIS_PASSWORD,
  tls: {},
  maxRetriesPerRequest: null,
}



export const redisConnection = new Redis(connectionOptions)

redisConnection.on("connect", () => logger.info("Redis connected"))
redisConnection.on("error", (err) => {
  logger.error(err, "Redis error")
  process.exit(1);
})


