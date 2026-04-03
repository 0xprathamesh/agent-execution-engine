export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Agent Execution Engine API",
    version: "1.0.0",
    description: "Job queue API. Create jobs and poll status.",
  },
  servers: [{ url: "/", description: "Current host" }],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        tags: ["Health"],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/job/job": {
      post: {
        summary: "Create job",
        tags: ["Jobs"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateJobRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Job created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/JobResponse" },
              },
            },
          },
          "400": { description: "Bad request (invalid type or payload)" },
          "500": { description: "Internal server error" },
        },
      },
    },
    "/api/v1/job/job/{id}": {
      get: {
        summary: "Get job by ID",
        tags: ["Jobs"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Job",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/JobResponse" },
              },
            },
          },
          "404": { description: "Job not found" },
        },
      },
    },
    "/api/v1/job/job/{id}/cancel": {
      post: {
        summary: "Cancel job",
        tags: ["Jobs"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Job cancelled",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/JobResponse" },
              },
            },
          },
          "404": { description: "Job not found" },
          "409": { description: "Job cannot be cancelled in current state" },
        },
      },
    },
  },
  components: {
    schemas: {
      HealthResponse: {
        type: "object",
        properties: { status: { type: "string", example: "ok" } },
      },
      CreateJobRequest: {
        type: "object",
        required: ["type", "payload"],
        properties: {
          type: {
            type: "string",
            enum: ["AGENT_TASK", "WEBHOOK", "GENERIC"],
            description: "Job type",
          },
          payload: {
            type: "object",
            description:
              "Type-specific payload. AGENT_TASK: { prompt, context? }. WEBHOOK: { url, method, body? }. GENERIC: any object.",
          },
          workflowRunId: { type: "string", format: "uuid" },
          maxRetries: { type: "integer", minimum: 0 },
        },
      },
      JobResponse: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          type: { type: "string", enum: ["AGENT_TASK", "WEBHOOK", "GENERIC"] },
          status: {
            type: "string",
            enum: ["PENDING", "QUEUED", "RUNNING", "SUCCESS", "FAILED"],
          },
          payload: {
            type: "object",
            description: "Echoed job payload. Free-form JSON object.",
            additionalProperties: true,
          },
          result: {
            type: "object",
            description:
              "Job result. Null until complete; then a free-form JSON object.",
            nullable: true,
            additionalProperties: true,
          },
          errorMessage: { type: "string", nullable: true },
          retries: { type: "integer" },
          maxRetries: { type: "integer" },
          queueJobId: { type: "string", nullable: true },
          workflowRunId: { type: "string", nullable: true },
          startedAt: { type: "string", format: "date-time", nullable: true },
          completedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
} as const;
