/*
  Warnings:

  - You are about to drop the column `workflowId` on the `Job` table. All the data in the column will be lost.
  - The `status` column on the `Workflow` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[key,version]` on the table `Workflow` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `key` to the `Workflow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Workflow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Workflow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `version` to the `Workflow` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WorkflowLifecycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NodeRunStatus" AS ENUM ('PENDING', 'READY', 'QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EdgeConditionType" AS ENUM ('ON_SUCCESS', 'ON_FAILURE', 'ALWAYS');

-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'CANCELLED';

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_workflowId_fkey";

-- DropIndex
DROP INDEX "Job_workflowId_idx";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "workflowId",
ADD COLUMN     "workflowRunId" TEXT;

-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "description" TEXT,
ADD COLUMN     "key" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "WorkflowLifecycleStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "WorkflowNode" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "nodeKey" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "payloadTemplate" JSONB NOT NULL,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "timeoutMs" INTEGER,
    "continueOnFailure" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowEdge" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "condition" "EdgeConditionType" NOT NULL DEFAULT 'ON_SUCCESS',

    CONSTRAINT "WorkflowEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB,
    "output" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowNodeRun" (
    "id" TEXT NOT NULL,
    "workflowRunId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" "NodeRunStatus" NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "errorMessage" TEXT,
    "queuedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "jobId" TEXT,

    CONSTRAINT "WorkflowNodeRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkflowNode_workflowId_idx" ON "WorkflowNode"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowNode_workflowId_nodeKey_key" ON "WorkflowNode"("workflowId", "nodeKey");

-- CreateIndex
CREATE INDEX "WorkflowEdge_workflowId_fromNodeId_idx" ON "WorkflowEdge"("workflowId", "fromNodeId");

-- CreateIndex
CREATE INDEX "WorkflowEdge_workflowId_toNodeId_idx" ON "WorkflowEdge"("workflowId", "toNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowEdge_workflowId_fromNodeId_toNodeId_condition_key" ON "WorkflowEdge"("workflowId", "fromNodeId", "toNodeId", "condition");

-- CreateIndex
CREATE INDEX "WorkflowRun_workflowId_status_createdAt_idx" ON "WorkflowRun"("workflowId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowNodeRun_jobId_key" ON "WorkflowNodeRun"("jobId");

-- CreateIndex
CREATE INDEX "WorkflowNodeRun_workflowRunId_status_idx" ON "WorkflowNodeRun"("workflowRunId", "status");

-- CreateIndex
CREATE INDEX "WorkflowNodeRun_nodeId_status_idx" ON "WorkflowNodeRun"("nodeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowNodeRun_workflowRunId_nodeId_key" ON "WorkflowNodeRun"("workflowRunId", "nodeId");

-- CreateIndex
CREATE INDEX "Job_workflowRunId_idx" ON "Job"("workflowRunId");

-- CreateIndex
CREATE INDEX "Workflow_key_status_idx" ON "Workflow"("key", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Workflow_key_version_key" ON "Workflow"("key", "version");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNode" ADD CONSTRAINT "WorkflowNode_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowEdge" ADD CONSTRAINT "WorkflowEdge_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowEdge" ADD CONSTRAINT "WorkflowEdge_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "WorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowEdge" ADD CONSTRAINT "WorkflowEdge_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "WorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNodeRun" ADD CONSTRAINT "WorkflowNodeRun_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNodeRun" ADD CONSTRAINT "WorkflowNodeRun_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "WorkflowNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNodeRun" ADD CONSTRAINT "WorkflowNodeRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
