import type { Request, Response } from "express";
import { jobService } from "./job.service";
import type { CreateJobInput } from "./job.types";
import { JobType } from "../../generated/prisma/enums";
import { logger } from "../../utils/logger";
import type { JobStatus } from "../../generated/prisma/enums";

function isJobType(value: string): value is CreateJobInput["type"] {
  return Object.values(JobType).includes(value as CreateJobInput["type"]);
}

function parseCreateBody(body: unknown): CreateJobInput | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Body must be an object" };
  }
  const o = body as Record<string, unknown>;
  const type = o.type;
  const payload = o.payload;
  if (typeof type !== "string" || !isJobType(type)) {
    return {
      error: `type must be one of: ${Object.values(JobType).join(", ")}`,
    };
  }
  if (typeof payload !== "object" || payload === null) {
    return { error: "payload must be an object" };
  }
  const workflowRunId =
    typeof o.workflowRunId === "string" ? o.workflowRunId : undefined;
  const maxRetries =
    typeof o.maxRetries === "number" &&
    Number.isInteger(o.maxRetries) &&
    o.maxRetries >= 0
      ? o.maxRetries
      : undefined;
  return {
    type: type as CreateJobInput["type"],
    payload: payload as CreateJobInput["payload"],
    workflowRunId,
    maxRetries,
  };
}

const jobController = {
  async createJob(req: Request, res: Response): Promise<void> {
    const parsed = parseCreateBody(req.body);
    if ("error" in parsed) {
      res.status(400).json({ message: parsed.error });
      return;
    }
    try {
      const job = await jobService.createJob(parsed);
      res.status(201).json(job);
    } catch (err) {
      logger.error(err, "createJob failed");
      res.status(500).json({ message: "Failed to create job" });
    }
  },

  async getJob(req: Request, res: Response): Promise<void> {
    const rawId = req.params.id;
    const id =
      typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";
    if (!id) {
      res.status(400).json({ message: "Missing job id" });
      return;
    }
    const job = await jobService.getJobById(id);
    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }
    res.json(job);
  },

  async cancelJob(req: Request, res: Response): Promise<void> {
    const rawId = req.params.id;
    const id =
      typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";
    if (!id) {
      res.status(400).json({ message: "Missing job id" });
      return;
    }

    const result = await jobService.cancelJob(id);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") {
        res.status(404).json({ message: result.message });
        return;
      }
      res.status(409).json({ message: result.message });
      return;
    }

    res.json(result.job);
  },

  async getAllJobs(req: Request, res: Response): Promise<void> {
    const {
      status,
      type,
      workflowRunId,
      queueJobId,
      startedAt,
      completedAt,
      limit,
      offset,
    } = req.query;

    const filters: {
      status?: JobStatus;
      type?: JobType;
      workflowRunId?: string;
      queueJobId?: string;
      startedAt?: Date;
      completedAt?: Date;
      limit?: number;
      offset?: number;
    } = (() => {
      const limitValue = Array.isArray(limit) ? limit[0] : limit;
      const offsetValue = Array.isArray(offset) ? offset[0] : offset;
      const limitParsed =
        typeof limitValue === "string" ? Number.parseInt(limitValue, 10) : NaN;
      const offsetParsed =
        typeof offsetValue === "string"
          ? Number.parseInt(offsetValue, 10)
          : NaN;

      const safeLimit =
        Number.isFinite(limitParsed) && limitParsed >= 0 ? limitParsed : 10;
      const safeOffset =
        Number.isFinite(offsetParsed) && offsetParsed >= 0 ? offsetParsed : 0;

      return { limit: safeLimit, offset: safeOffset };
    })();
    if (status) {
      filters.status = status as JobStatus;
    }
    if (type) {
      filters.type = type as JobType;
    }
    if (workflowRunId) {
      filters.workflowRunId = workflowRunId as string;
    }
    if (queueJobId) {
      filters.queueJobId = queueJobId as string;
    }
    if (startedAt) {
      filters.startedAt = new Date(startedAt as string);
    }
    if (completedAt) {
      filters.completedAt = new Date(completedAt as string);
    }
    const { jobs, total } = await jobService.getJobs(filters);
    res.json({ jobs, total });
  },
};

export { jobController };
