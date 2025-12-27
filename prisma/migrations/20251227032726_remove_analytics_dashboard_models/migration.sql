/*
  Warnings:

  - You are about to drop the `AnalyticsDashboard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AnalyticsWidget` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AnalyticsDashboard" DROP CONSTRAINT "AnalyticsDashboard_createdById_fkey";

-- DropForeignKey
ALTER TABLE "AnalyticsWidget" DROP CONSTRAINT "AnalyticsWidget_dashboardId_fkey";

-- DropTable
DROP TABLE "AnalyticsDashboard";

-- DropTable
DROP TABLE "AnalyticsWidget";
