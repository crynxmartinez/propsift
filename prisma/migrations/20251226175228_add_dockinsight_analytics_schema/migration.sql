-- AlterTable
ALTER TABLE "Record" ADD COLUMN     "emailCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "motivationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "phoneCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tagCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "RecordEmail" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "RecordMotivation" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "RecordPhoneNumber" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "RecordTag" ADD COLUMN     "createdById" TEXT;

-- CreateIndex
CREATE INDEX "Record_createdById_idx" ON "Record"("createdById");

-- CreateIndex
CREATE INDEX "Record_createdById_createdAt_idx" ON "Record"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "Record_createdById_temperature_idx" ON "Record"("createdById", "temperature");

-- CreateIndex
CREATE INDEX "Record_createdById_statusId_idx" ON "Record"("createdById", "statusId");

-- CreateIndex
CREATE INDEX "Record_createdById_assignedToId_idx" ON "Record"("createdById", "assignedToId");

-- CreateIndex
CREATE INDEX "RecordEmail_createdById_idx" ON "RecordEmail"("createdById");

-- CreateIndex
CREATE INDEX "RecordEmail_createdById_createdAt_idx" ON "RecordEmail"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "RecordMotivation_createdById_idx" ON "RecordMotivation"("createdById");

-- CreateIndex
CREATE INDEX "RecordMotivation_createdById_createdAt_idx" ON "RecordMotivation"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "RecordMotivation_recordId_idx" ON "RecordMotivation"("recordId");

-- CreateIndex
CREATE INDEX "RecordMotivation_motivationId_idx" ON "RecordMotivation"("motivationId");

-- CreateIndex
CREATE INDEX "RecordPhoneNumber_createdById_idx" ON "RecordPhoneNumber"("createdById");

-- CreateIndex
CREATE INDEX "RecordPhoneNumber_createdById_createdAt_idx" ON "RecordPhoneNumber"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "RecordTag_createdById_idx" ON "RecordTag"("createdById");

-- CreateIndex
CREATE INDEX "RecordTag_createdById_createdAt_idx" ON "RecordTag"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "RecordTag_recordId_idx" ON "RecordTag"("recordId");

-- CreateIndex
CREATE INDEX "RecordTag_tagId_idx" ON "RecordTag"("tagId");

-- CreateIndex
CREATE INDEX "Task_createdById_createdAt_idx" ON "Task"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "Task_createdById_status_idx" ON "Task"("createdById", "status");

-- CreateIndex
CREATE INDEX "Task_createdById_priority_idx" ON "Task"("createdById", "priority");
