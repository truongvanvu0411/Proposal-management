ALTER TABLE "Product" ADD COLUMN "modelNumber" TEXT;
ALTER TABLE "Product" ADD COLUMN "features" JSONB;

ALTER TABLE "Project" ADD COLUMN "proposalBackground" TEXT;
ALTER TABLE "Project" ADD COLUMN "recommendationPoints" JSONB;
ALTER TABLE "Project" ADD COLUMN "remarks" TEXT;

ALTER TABLE "ProjectProduct" ADD COLUMN "recommendationReasons" JSONB;
ALTER TABLE "ProjectProduct" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProjectProduct" ADD COLUMN "orderPlannedDate" TIMESTAMP(3);
