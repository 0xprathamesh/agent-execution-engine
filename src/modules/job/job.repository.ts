import type { JobStatus, JobType } from "../../generated/prisma/enums"
import type { JobRecord, JobResponse } from "./job.types"
import { prisma } from "../../infra/db/prisma"

function toResponse(job: JobRecord): JobResponse {
  return {
    id: job.id,
    type: job.type as JobType,
    status: job.status as JobStatus,
    payload: job.payload,
    result: job.result ?? null,
    errorMessage: job.errorMessage ?? null,
    retries: job.retries,
    maxRetries: job.maxRetries,
    queueJobId: job.queueJobId ?? null,
    workflowId: job.workflowId ?? null,
    startedAt: job.startedAt ?? null,
    completedAt: job.completedAt ?? null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }
}

export const jobRepository = {
  async create(params: {
    type: JobType
    payload: import("../../generated/prisma/client").Prisma.InputJsonValue
    workflowId?: string
    maxRetries?: number
  }): Promise<JobRecord> {
    const job = await prisma.job.create({
      data: {
        type: params.type,
        payload: params.payload,
        workflowId: params.workflowId ?? undefined,
        maxRetries: params.maxRetries ?? 3,
      },
    })
    return job as JobRecord
  },

  async findById(id: string): Promise<JobRecord | undefined> {
    const job = await prisma.job.findUnique({
      where: { id },
    })
    return job ? (job as JobRecord) : undefined
  },

  async getById(id: string): Promise<JobResponse | undefined> {
    const job = await this.findById(id)
    return job ? toResponse(job) : undefined
  },

  async setQueued(id: string, queueJobId: string): Promise<JobRecord> {
    const job = await prisma.job.update({
      where: { id },
      data: { status: "QUEUED", queueJobId },
    })
    return job as JobRecord
  },

  async setRunning(id: string): Promise<JobRecord> {
    const job = await prisma.job.update({
      where: { id },
      data: { status: "RUNNING", startedAt: new Date() },
    })
    return job as JobRecord
  },

 
  async setRunningIfQueued(id: string): Promise<boolean> {
    const result = await prisma.job.updateMany({
      where: { id, status: "QUEUED" },
      data: { status: "RUNNING", startedAt: new Date() },
    })
    return result.count === 1
  },

  async setSuccess(id: string, result: JobRecord["result"]): Promise<JobRecord> {
    const job = await prisma.job.update({
      where: { id },
      data: {
        status: "SUCCESS",
        result: result as import("../../generated/prisma/client").Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    })
    return job as JobRecord
  },

  async setFailed(
    id: string,
    errorMessage: string,
    result?: JobRecord["result"],
    retries?: number
  ): Promise<JobRecord> {
    const data: Parameters<typeof prisma.job.update>[0]["data"] = {
      status: "FAILED",
      errorMessage,
      result: result ?? undefined,
      completedAt: new Date(),
    }
    if (retries !== undefined) data.retries = retries
    const job = await prisma.job.update({
      where: { id },
      data,
    })
    return job as JobRecord
  },

  async incrementRetries(id: string): Promise<JobRecord> {
    const job = await prisma.job.update({
      where: { id },
      data: { retries: { increment: 1 } },
    })
    return job as JobRecord
  },


  async findStuckRunning(olderThan: Date): Promise<JobRecord[]> {
    const jobs = await prisma.job.findMany({
      where: { status: "RUNNING", startedAt: { lt: olderThan } },
    })
    return jobs as JobRecord[]
  },


  async requeueStuck(id: string): Promise<JobRecord> {
    const job = await prisma.job.update({
      where: { id },
      data: { status: "QUEUED", startedAt: null },
    })
    return job as JobRecord
  },
}
