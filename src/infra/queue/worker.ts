import type { Job } from "bullmq"
import { Worker } from "bullmq"
import { redisConnection } from "../redis/client"
import { ENV } from "../../config/env"
import { logger } from "../../utils/logger"
import { processJob } from "../../modules/job/job.processor"
import { jobRepository } from "../../modules/job/job.repository"
import type { QueueJobDataUnion } from "../../modules/job/job.types"
import { JobType } from "../../generated/prisma/enums"

function isQueueJobData(data: unknown): data is QueueJobDataUnion {
  if (typeof data !== "object" || data === null) return false
  const o = data as Record<string, unknown>
  return (
    typeof o.jobId === "string" &&
    typeof o.type === "string" &&
    Object.values(JobType).includes(o.type as (typeof JobType)[keyof typeof JobType]) &&
    typeof o.payload === "object" &&
    o.payload !== null
  )
}


async function handleJob(bullJob: Job<QueueJobDataUnion>): Promise<void> {
  const data = bullJob.data
  const { jobId } = data

  const job = await jobRepository.findById(jobId)
  if (!job) {
    logger.error({ jobId }, "Job not found")
    throw new Error(`Job not found: ${jobId}`)
  }

 
  if (job.status === "SUCCESS" || job.status === "FAILED") {
    logger.info({ jobId, status: job.status }, "Job already terminal, skipping")
    return
  }


  const claimed = await jobRepository.setRunningIfQueued(jobId)
  if (!claimed) {
    logger.info({ jobId }, "Job not claimed (already RUNNING or taken), skipping")
    return
  }

  try {
    const result = await processJob(data)
    await jobRepository.setSuccess(jobId, result)
    logger.info({ jobId, type: data.type }, "Job completed")
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    const retriesForDb = bullJob.attemptsMade + 1
    await jobRepository.setFailed(jobId, message, undefined, retriesForDb)
    logger.error({ err, jobId, attemptsMade: bullJob.attemptsMade }, "Job failed")
    throw err
  }
}

export const jobWorker = new Worker(
  "agent-jobs",
  async (job) => {
    await handleJob(job as Job<QueueJobDataUnion>)
  },
  {
    connection: {
      host: redisConnection.options.host,
      port: redisConnection.options.port,
      password: redisConnection.options.password,
      tls: redisConnection.options.tls,
      maxRetriesPerRequest: redisConnection.options.maxRetriesPerRequest,
    },
    concurrency: ENV.WORKER_CONCURRENCY,
    lockDuration: ENV.JOB_TIMEOUT_MS,
  }
)
