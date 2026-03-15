import type { Request, Response } from "express"
import { jobService } from "./job.service"
import type { CreateJobInput, ListJobsFilters } from "./job.types"
import { JobStatus, JobType } from "../../generated/prisma/enums"
import { logger } from "../../utils/logger"

function isJobType(value: string): value is JobType {
  return Object.values(JobType).includes(value as JobType)
}

function isJobStatus(value: string): value is JobStatus {
  return Object.values(JobStatus).includes(value as JobStatus)
}

function parseCreateBody(body: unknown): CreateJobInput | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Body must be an object" }
  }
  const o = body as Record<string, unknown>
  const type = o.type
  const payload = o.payload
  if (typeof type !== "string" || !isJobType(type)) {
    return { error: `type must be one of: ${Object.values(JobType).join(", ")}` }
  }
  if (typeof payload !== "object" || payload === null) {
    return { error: "payload must be an object" }
  }
  const workflowId = typeof o.workflowId === "string" ? o.workflowId : undefined
  const maxRetries =
    typeof o.maxRetries === "number" && Number.isInteger(o.maxRetries) && o.maxRetries >= 0
      ? o.maxRetries
      : undefined
  return { type: type as CreateJobInput["type"], payload: payload as CreateJobInput["payload"], workflowId, maxRetries }
}

const jobController = {
  async createJob(req: Request, res: Response): Promise<void> {
    const parsed = parseCreateBody(req.body)
    if ("error" in parsed) {
      res.status(400).json({ message: parsed.error })
      return
    }
    try {
      const job = await jobService.createJob(parsed)
      res.status(201).json(job)
    } catch (err) {
      logger.error(err, "createJob failed")
      res.status(500).json({ message: "Failed to create job" })
    }
  },

  async getJob(req: Request, res: Response): Promise<void> {
    const rawId = req.params.id
    const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : ""
    if (!id) {
      res.status(400).json({ message: "Missing job id" })
      return
    }
    const job = await jobService.getJobById(id)
    if (!job) {
      res.status(404).json({ message: "Job not found" })
      return
    }
    res.json(job)
  },

  async listJobs(req: Request, res: Response): Promise<void> {
    const { status, type, limit, offset } = req.query

    const filters: ListJobsFilters = {}

    if (typeof status === "string" && isJobStatus(status)) {
      filters.status = status
    }
    if (typeof type === "string" && isJobType(type)) {
      filters.type = type
    }
    if (typeof limit === "string") {
      const parsedLimit = parseInt(limit, 10)
      if (!isNaN(parsedLimit)) {
        filters.limit = parsedLimit
      }
    }
    if (typeof offset === "string") {
      const parsedOffset = parseInt(offset, 10)
      if (!isNaN(parsedOffset)) {
        filters.offset = parsedOffset
      }
    }

    try {
      const result = await jobService.listJobs(filters)
      res.json(result)
    } catch (err) {
      logger.error(err, "listJobs failed")
      res.status(500).json({ message: "Failed to list jobs" })
    }
  },
}

export { jobController }
