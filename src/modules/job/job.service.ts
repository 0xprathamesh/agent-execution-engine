import { jobQueue } from "../../infra/queue/queue"
import { jobRepository } from "./job.repository"
import type { CreateJobInput, JobResponse, QueueJobData } from "./job.types"
import type { JobType } from "../../generated/prisma/enums"
import { ENV } from "../../config/env"

const JOB_NAME = "process"

export const jobService = {
  async createJob<T extends JobType>(input: CreateJobInput<T>): Promise<JobResponse> {
    const job = await jobRepository.create({
      type: input.type,
      payload: input.payload as import("../../generated/prisma/client").Prisma.InputJsonValue,
      workflowId: input.workflowId,
      maxRetries: input.maxRetries,
    })

    const maxRetries = input.maxRetries ?? job.maxRetries
    const queueJob = await jobQueue.add(
      JOB_NAME,
      {
        jobId: job.id,
        type: input.type,
        payload: input.payload,
      } satisfies QueueJobData<T>,
      {
        jobId: job.id,
        attempts: maxRetries + 1,
        backoff: { type: ENV.QUEUE_BACKOFF_TYPE, delay: ENV.QUEUE_BACKOFF_DELAY_MS },
      }
    )

    await jobRepository.setQueued(job.id, queueJob.id ?? job.id)

    const updated = await jobRepository.getById(job.id)
    if (!updated) throw new Error("Job not found after create")
    return updated
  },

  async getJobById(id: string): Promise<JobResponse | undefined> {
    return jobRepository.getById(id)
  },
}
