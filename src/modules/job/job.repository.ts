import type { JobStatus, JobType } from "../../generated/prisma/enums";
import type { JobRecord, JobResponse } from "./job.types";
import { prisma } from "../../infra/db/prisma";

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
    workflowRunId: job.workflowRunId ?? null,
    startedAt: job.startedAt ?? null,
    completedAt: job.completedAt ?? null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}


export const jobRepository = {
  async findAll(filters: {
    status?: JobStatus;
    type?: JobType;
    workflowRunId?: string;
    queueJobId?: string;
    startedAt?: Date;
    completedAt?: Date;
    limit?: number;
    offset?: number;
  }): Promise<JobRecord[]> {
    const { limit, offset, ...whereFilters } = filters;
    const take =
      limit === undefined ? undefined : Math.max(0, Math.min(limit, 100));
    const skip = offset === undefined ? undefined : Math.max(0, offset);

    const jobs = await prisma.job.findMany({
      where: whereFilters,
      take,
      skip,
      orderBy: {
        createdAt: "desc",
      },
    });
    return jobs as JobRecord[];
  },
  async count(filters: {
    status?: JobStatus;
    type?: JobType;
    workflowRunId?: string;
    queueJobId?: string;
    startedAt?: Date;
    completedAt?: Date;
  }): Promise<number> {
    const {
      limit: _limit,
      offset: _offset,
      ...whereFilters
    } = filters as typeof filters & {
      limit?: number;
      offset?: number;
    };
    return await prisma.job.count({ where: whereFilters });
  },
  async create(params: {
    type: JobType;
    payload: import("../../generated/prisma/client").Prisma.InputJsonValue;
    workflowRunId?: string;
    maxRetries?: number;
  }): Promise<JobRecord> {
    const job = await prisma.job.create({
      data: {
        type: params.type,
        payload: params.payload,
        workflowRunId: params.workflowRunId ?? undefined,
        maxRetries: params.maxRetries ?? 3,
      },
    });
    return job as JobRecord;
  },

  async findById(id: string): Promise<JobRecord | undefined> {
    const job = await prisma.job.findUnique({
      where: { id },
    });
    return job ? (job as JobRecord) : undefined;
  },

  async getById(id: string): Promise<JobResponse | undefined> {
    const job = await this.findById(id);
    return job ? toResponse(job) : undefined;
  },

  async setQueued(id: string, queueJobId: string): Promise<JobRecord> {
    const job = await prisma.job.update({
      where: { id },
      data: { status: "QUEUED", queueJobId },
    });
    return job as JobRecord;
  },

  async setRunning(id: string): Promise<JobRecord> {
    const job = await prisma.job.update({
      where: { id },
      data: { status: "RUNNING", startedAt: new Date() },
    });
    return job as JobRecord;
  },

  async setRunningIfQueued(id: string): Promise<boolean> {
    const result = await prisma.job.updateMany({
      where: { id, status: "QUEUED" },
      data: { status: "RUNNING", startedAt: new Date() },
    });
    return result.count === 1;
  },

  async setSuccess(
    id: string,
    result: JobRecord["result"],
  ): Promise<JobRecord> {
    const job = await prisma.job.update({
      where: { id },
      data: {
        status: "SUCCESS",
        result:
          result as import("../../generated/prisma/client").Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
    return job as JobRecord;
  },

  async setFailed(
    id: string,
    errorMessage: string,
    result?: JobRecord["result"],
    retries?: number,
  ): Promise<JobRecord> {
    const data: Parameters<typeof prisma.job.update>[0]["data"] = {
      status: "FAILED",
      errorMessage,
      result: result ?? undefined,
      completedAt: new Date(),
    };
    if (retries !== undefined) data.retries = retries;
    const job = await prisma.job.update({
      where: { id },
      data,
    });
    return job as JobRecord;
  },

  async incrementRetries(id: string): Promise<JobRecord> {
    const job = await prisma.job.update({
      where: { id },
      data: { retries: { increment: 1 } },
    });
    return job as JobRecord;
  },

  async findStuckRunning(olderThan: Date): Promise<JobRecord[]> {
    const jobs = await prisma.job.findMany({
      where: { status: "RUNNING", startedAt: { lt: olderThan } },
    });
    return jobs as JobRecord[];
  },

  async requeueStuck(id: string): Promise<JobRecord> {
    const job = await prisma.job.update({
      where: { id },
      data: { status: "QUEUED", startedAt: null },
    });
    return job as JobRecord;
  },

  async cancelIfPendingOrQueued(
    id: string,
    errorMessage: string,
  ): Promise<boolean> {
    const result = await prisma.job.updateMany({
      where: { id, status: { in: ["PENDING", "QUEUED"] } },
      data: {
        status: "FAILED",
        errorMessage,
        completedAt: new Date(),
      },
    });
    return result.count === 1;
  },
};
