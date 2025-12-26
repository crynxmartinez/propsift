/*
  Warnings:

  - A unique constraint covering the columns `[name,createdById]` on the table `CustomFieldDefinition` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,createdById]` on the table `Motivation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,createdById]` on the table `Status` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,createdById]` on the table `Tag` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,createdById]` on the table `TaskTemplate` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Motivation_name_key";

-- DropIndex
DROP INDEX "Status_name_key";

-- DropIndex
DROP INDEX "Tag_name_key";

-- AlterTable
ALTER TABLE "CustomFieldDefinition" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Motivation" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Record" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Status" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "notifyAfter" INTEGER,
ADD COLUMN     "notifyAfterUnit" TEXT,
ADD COLUMN     "repeatCount" INTEGER;

-- AlterTable
ALTER TABLE "TaskTemplate" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountOwnerId" TEXT,
ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "billingCity" TEXT,
ADD COLUMN     "billingCountry" TEXT DEFAULT 'United States',
ADD COLUMN     "billingState" TEXT,
ADD COLUMN     "billingZip" TEXT,
ADD COLUMN     "companyEmail" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "companyPhone" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'owner',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "timezone" TEXT DEFAULT 'America/Chicago';

-- CreateTable
CREATE TABLE "FilterFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilterFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilterTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "folderId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilterTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardColumn" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "boardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordBoardPosition" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordBoardPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "folderId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "workflowData" JSONB,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationLog" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "recordId" TEXT,
    "triggeredBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "steps" JSONB,
    "errorMessage" TEXT,
    "errorNodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FilterFolder_name_createdById_key" ON "FilterFolder"("name", "createdById");

-- CreateIndex
CREATE INDEX "FilterTemplate_folderId_idx" ON "FilterTemplate"("folderId");

-- CreateIndex
CREATE UNIQUE INDEX "FilterTemplate_name_createdById_key" ON "FilterTemplate"("name", "createdById");

-- CreateIndex
CREATE INDEX "Board_createdById_idx" ON "Board"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Board_name_createdById_key" ON "Board"("name", "createdById");

-- CreateIndex
CREATE INDEX "BoardColumn_boardId_idx" ON "BoardColumn"("boardId");

-- CreateIndex
CREATE INDEX "BoardColumn_order_idx" ON "BoardColumn"("order");

-- CreateIndex
CREATE INDEX "RecordBoardPosition_columnId_idx" ON "RecordBoardPosition"("columnId");

-- CreateIndex
CREATE INDEX "RecordBoardPosition_recordId_idx" ON "RecordBoardPosition"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordBoardPosition_recordId_columnId_key" ON "RecordBoardPosition"("recordId", "columnId");

-- CreateIndex
CREATE INDEX "AutomationFolder_createdById_idx" ON "AutomationFolder"("createdById");

-- CreateIndex
CREATE INDEX "AutomationFolder_order_idx" ON "AutomationFolder"("order");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationFolder_name_createdById_key" ON "AutomationFolder"("name", "createdById");

-- CreateIndex
CREATE INDEX "Automation_createdById_idx" ON "Automation"("createdById");

-- CreateIndex
CREATE INDEX "Automation_folderId_idx" ON "Automation"("folderId");

-- CreateIndex
CREATE INDEX "Automation_isActive_idx" ON "Automation"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Automation_name_createdById_key" ON "Automation"("name", "createdById");

-- CreateIndex
CREATE INDEX "AutomationLog_automationId_idx" ON "AutomationLog"("automationId");

-- CreateIndex
CREATE INDEX "AutomationLog_recordId_idx" ON "AutomationLog"("recordId");

-- CreateIndex
CREATE INDEX "AutomationLog_status_idx" ON "AutomationLog"("status");

-- CreateIndex
CREATE INDEX "AutomationLog_createdAt_idx" ON "AutomationLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_name_createdById_key" ON "CustomFieldDefinition"("name", "createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Motivation_name_createdById_key" ON "Motivation"("name", "createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Status_name_createdById_key" ON "Status"("name", "createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_createdById_key" ON "Tag"("name", "createdById");

-- CreateIndex
CREATE UNIQUE INDEX "TaskTemplate_name_createdById_key" ON "TaskTemplate"("name", "createdById");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_accountOwnerId_fkey" FOREIGN KEY ("accountOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Motivation" ADD CONSTRAINT "Motivation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Status" ADD CONSTRAINT "Status_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilterFolder" ADD CONSTRAINT "FilterFolder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilterTemplate" ADD CONSTRAINT "FilterTemplate_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "FilterFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilterTemplate" ADD CONSTRAINT "FilterTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardColumn" ADD CONSTRAINT "BoardColumn_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordBoardPosition" ADD CONSTRAINT "RecordBoardPosition_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordBoardPosition" ADD CONSTRAINT "RecordBoardPosition_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "BoardColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationFolder" ADD CONSTRAINT "AutomationFolder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "AutomationFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationLog" ADD CONSTRAINT "AutomationLog_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
