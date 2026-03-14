import { Queue } from "bullmq"
import { redisConnection } from "../redis/client"

export const jobQueue = new Queue("agent-jobs", {
    connection: {
        host: redisConnection.options.host,
        port: redisConnection.options.port,
        password: redisConnection.options.password,
        tls: redisConnection.options.tls,
        maxRetriesPerRequest: redisConnection.options.maxRetriesPerRequest,
    }
})