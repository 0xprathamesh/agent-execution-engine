import { jobQueue } from "../../infra/queue/queue";
import { jobRepository } from "./job.repository";
import type { CreateJobInput, JobResponse, QueueJobData } from "./job.types";
import type { JobType } from "../../generated/prisma/enums";
import { ENV } from "../../config/env";
import type { JobStatus } from "../../generated/prisma/enums";
import { logger } from "../../utils/logger";

const JOB_NAME = "process";

const CANCELLED_BY_USER_MESSAGE = "Cancelled by user";

type CancelJobResult =
  | { ok: true; job: JobResponse }
  | { ok: false; code: "NOT_FOUND"; message: string }
  | { ok: false; code: "INVALID_STATE"; message: string };

export const jobService = {
  async getJobs(filters: {
    status?: JobStatus;
    type?: JobType;
    workflowRunId?: string;
    queueJobId?: string;
    startedAt?: Date;
    completedAt?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: JobResponse[]; total: number }> {
    const [jobs, total] = await Promise.all([
      jobRepository.findAll(filters),
      jobRepository.count(filters),
    ]);

    return { jobs, total };
  },

  async createJob<T extends JobType>(
    input: CreateJobInput<T>,
  ): Promise<JobResponse> {
    const job = await jobRepository.create({
      type: input.type,
      payload:
        input.payload as import("../../generated/prisma/client").Prisma.InputJsonValue,
      workflowRunId: input.workflowRunId,
      maxRetries: input.maxRetries,
    });

    const maxRetries = input.maxRetries ?? job.maxRetries;
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
        backoff: {
          type: ENV.QUEUE_BACKOFF_TYPE,
          delay: ENV.QUEUE_BACKOFF_DELAY_MS,
        },
      },
    );

    await jobRepository.setQueued(job.id, queueJob.id ?? job.id);

    const updated = await jobRepository.getById(job.id);
    if (!updated) throw new Error("Job not found after create");
    return updated;
  },

  async getJobById(id: string): Promise<JobResponse | undefined> {
    return jobRepository.getById(id);
  },

  async cancelJob(id: string): Promise<CancelJobResult> {
    const existing = await jobRepository.findById(id);
    if (!existing) {
      return { ok: false, code: "NOT_FOUND", message: "Job not found" };
    }

    if (existing.status !== "PENDING" && existing.status !== "QUEUED") {
      return {
        ok: false,
        code: "INVALID_STATE",
        message: `Job cannot be cancelled in status ${existing.status}. Only PENDING or QUEUED jobs can be cancelled.`,
      };
    }

    const cancelled = await jobRepository.cancelIfPendingOrQueued(
      id,
      CANCELLED_BY_USER_MESSAGE,
    );
    if (!cancelled) {
      const latest = await jobRepository.findById(id);
      if (!latest) {
        return { ok: false, code: "NOT_FOUND", message: "Job not found" };
      }
      return {
        ok: false,
        code: "INVALID_STATE",
        message: `Job cannot be cancelled in status ${latest.status}. Only PENDING or QUEUED jobs can be cancelled.`,
      };
    }

    if (existing.queueJobId) {
      try {
        const queuedJob = await jobQueue.getJob(existing.queueJobId);
        if (queuedJob) {
          await queuedJob.remove();
        }
      } catch (err) {
        logger.warn(
          { err, jobId: id },
          "Failed to remove cancelled job from queue",
        );
      }
    }

    const updated = await jobRepository.getById(id);
    if (!updated) {
      return { ok: false, code: "NOT_FOUND", message: "Job not found" };
    }

    return { ok: true, job: updated };
  },
};
