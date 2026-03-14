import { jobQueue } from "./queue"
import { jobRepository } from "../../modules/job/job.repository"
import { logger } from "../../utils/logger"
import { ENV } from "../../config/env"

const JOB_NAME = "process"

export async function recoverStuckJobs(): Promise<void> {
  const olderThan = new Date(Date.now() - ENV.STUCK_JOB_THRESHOLD_MS)
  const stuck = await jobRepository.findStuckRunning(olderThan)
  if (stuck.length === 0) return

  logger.warn({ count: stuck.length, olderThan }, "Recovering stuck RUNNING jobs")

  for (const job of stuck) {
    try {
      await jobRepository.requeueStuck(job.id)
      await jobQueue.add(
        JOB_NAME,
        {
          jobId: job.id,
          type: job.type,
          payload: job.payload,
        },
        { jobId: `recovery-${job.id}-${Date.now()}` }
      )
      logger.info({ jobId: job.id }, "Re-queued stuck job")
    } catch (err) {
      logger.error({ err, jobId: job.id }, "Failed to re-queue stuck job")
    }
  }
}

let intervalId: ReturnType<typeof setInterval> | undefined

export function startStuckJobRecovery(): void {
  if (intervalId !== undefined) return
  intervalId = setInterval(() => {
    recoverStuckJobs().catch((err) => logger.error(err, "Stuck job recovery failed"))
  }, ENV.STUCK_JOB_CHECK_INTERVAL_MS)
  logger.info(
    {
      thresholdMs: ENV.STUCK_JOB_THRESHOLD_MS,
      intervalMs: ENV.STUCK_JOB_CHECK_INTERVAL_MS,
    },
    "Stuck job recovery started"
  )
}

export function stopStuckJobRecovery(): void {
  if (intervalId !== undefined) {
    clearInterval(intervalId)
    intervalId = undefined
    logger.info("Stuck job recovery stopped")
  }
}
