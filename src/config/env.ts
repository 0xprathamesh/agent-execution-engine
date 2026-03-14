import dotenv from "dotenv"

dotenv.config()

const defaultStuckThresholdMs = 10 * 60 * 1000 // 10 minutes
const defaultStuckCheckIntervalMs = 2 * 60 * 1000 // 2 minutes
const defaultBackoffDelayMs = 2000
const defaultJobTimeoutMs = 5 * 60 * 1000 // 5 minutes

export const ENV = {
  PORT: process.env.PORT ?? 3000,
  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_HOST: process.env.REDIS_HOST!,
  REDIS_PORT: process.env.REDIS_PORT!,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD!,

  // Stuck job recovery (scheduler in worker process)
  STUCK_JOB_THRESHOLD_MS: process.env.STUCK_JOB_THRESHOLD_MS
    ? Number(process.env.STUCK_JOB_THRESHOLD_MS)
    : defaultStuckThresholdMs,
  STUCK_JOB_CHECK_INTERVAL_MS: process.env.STUCK_JOB_CHECK_INTERVAL_MS
    ? Number(process.env.STUCK_JOB_CHECK_INTERVAL_MS)
    : defaultStuckCheckIntervalMs,

  // Queue retry policy (used when adding jobs)
  QUEUE_BACKOFF_DELAY_MS: process.env.QUEUE_BACKOFF_DELAY_MS
    ? Number(process.env.QUEUE_BACKOFF_DELAY_MS)
    : defaultBackoffDelayMs,
  QUEUE_BACKOFF_TYPE: (process.env.QUEUE_BACKOFF_TYPE === "fixed" ? "fixed" : "exponential") as
    | "exponential"
    | "fixed",

  // Job execution timeout (BullMQ lockDuration + job timeout)
  JOB_TIMEOUT_MS: process.env.JOB_TIMEOUT_MS ? Number(process.env.JOB_TIMEOUT_MS) : defaultJobTimeoutMs,

  // Worker concurrency (parallel jobs per worker process)
  WORKER_CONCURRENCY: process.env.WORKER_CONCURRENCY ? Number(process.env.WORKER_CONCURRENCY) : 1,
}
