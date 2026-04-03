import type { JobStatus as PrismaJobStatus, JobType as PrismaJobType } from "../../generated/prisma/enums"
import type { Prisma } from "../../generated/prisma/client"
export { JobStatus, JobType } from "../../generated/prisma/enums"



export type AgentTaskPayload = { prompt: string; context?: string }
export type WebhookPayload = { url: string; method: string; body?: Record<string, unknown> }
export type GenericPayload = Record<string, unknown>

export type JobPayloadByType = {
  AGENT_TASK: AgentTaskPayload
  WEBHOOK: WebhookPayload
  GENERIC: GenericPayload
}


export type CreateJobInput<T extends PrismaJobType = PrismaJobType> = {
  type: T
  payload: JobPayloadByType[T]
  workflowRunId?: string
  maxRetries?: number
}


export type QueueJobData<T extends PrismaJobType = PrismaJobType> = {
  jobId: string
  type: T
  payload: JobPayloadByType[T]
}


export type QueueJobDataUnion =
  | { jobId: string; type: "AGENT_TASK"; payload: AgentTaskPayload }
  | { jobId: string; type: "WEBHOOK"; payload: WebhookPayload }
  | { jobId: string; type: "GENERIC"; payload: GenericPayload }


export type JobResponse = {
  id: string
  type: PrismaJobType
  status: PrismaJobStatus
  payload: Prisma.JsonValue
  result: Prisma.JsonValue | null
  errorMessage: string | null
  retries: number
  maxRetries: number
  queueJobId: string | null
  workflowRunId: string | null
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}


export type JobRecord = import("../../generated/prisma/client").Job
