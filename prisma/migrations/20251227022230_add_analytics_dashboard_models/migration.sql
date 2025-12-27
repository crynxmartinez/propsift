-- CreateTable
CREATE TABLE "AnalyticsDashboard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "columns" INTEGER NOT NULL DEFAULT 12,
    "globalFilters" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsWidget" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "segmentKey" TEXT,
    "metric" JSONB NOT NULL,
    "dimension" TEXT,
    "filters" JSONB,
    "dateRange" JSONB,
    "dateMode" TEXT,
    "granularity" TEXT,
    "sort" JSONB,
    "limit" INTEGER,
    "x" INTEGER NOT NULL DEFAULT 0,
    "y" INTEGER NOT NULL DEFAULT 0,
    "w" INTEGER NOT NULL DEFAULT 6,
    "h" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsWidget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsDashboard_createdById_idx" ON "AnalyticsDashboard"("createdById");

-- CreateIndex
CREATE INDEX "AnalyticsDashboard_createdById_isDefault_idx" ON "AnalyticsDashboard"("createdById", "isDefault");

-- CreateIndex
CREATE INDEX "AnalyticsWidget_dashboardId_idx" ON "AnalyticsWidget"("dashboardId");

-- AddForeignKey
ALTER TABLE "AnalyticsDashboard" ADD CONSTRAINT "AnalyticsDashboard_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsWidget" ADD CONSTRAINT "AnalyticsWidget_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "AnalyticsDashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
