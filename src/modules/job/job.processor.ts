import type { JobType } from "../../generated/prisma/enums"
import type { JobPayloadByType, QueueJobDataUnion } from "./job.types"
import type { Prisma } from "../../generated/prisma/client"
import { logger } from "../../utils/logger"

type ProcessorResult = Prisma.JsonValue


const processors: {
  [K in JobType]: (payload: JobPayloadByType[K]) => Promise<ProcessorResult>
} = {
  AGENT_TASK: async (payload) => {
    logger.info({ payload }, "Processing AGENT_TASK")
    
    return { output: `Processed: ${payload.prompt}`, context: payload.context ?? "" }
  },

  WEBHOOK: async (payload) => {
    logger.info({ payload }, "Processing WEBHOOK")
    return { called: payload.url, method: payload.method }
  },

  GENERIC: async (payload) => {
    logger.info({ payload }, "Processing GENERIC")
    return payload as unknown as ProcessorResult
  },
}

export async function processJob(data: QueueJobDataUnion): Promise<ProcessorResult> {
  switch (data.type) {
    case "AGENT_TASK":
      return processors.AGENT_TASK(data.payload)
    case "WEBHOOK":
      return processors.WEBHOOK(data.payload)
    case "GENERIC":
      return processors.GENERIC(data.payload)
    default:
      throw new Error(`Unknown job type: ${String((data as { type: string }).type)}`)
  }
}
