/**
 * Worker entrypoint: run as a separate process from the API server.
 * - Consumes jobs from the "agent-jobs" queue
 * - Runs stuck-job recovery scheduler (re-queues RUNNING jobs older than threshold)
 *
 * Run: npm run worker  (or npx ts-node-dev src/worker.ts)
 */
import { jobWorker } from "./infra/queue/worker"
import { startStuckJobRecovery, stopStuckJobRecovery } from "./infra/queue/stuck-job-recovery"
import { prisma } from "./infra/db/prisma"
import { redisConnection } from "./infra/redis/client"
import { logger } from "./utils/logger"

startStuckJobRecovery()

process.on("SIGINT", async () => {
  logger.info("Worker shutting down...")
  stopStuckJobRecovery()
  await jobWorker.close()
  await prisma.$disconnect()
  await redisConnection.quit()
  process.exit(0)
})
