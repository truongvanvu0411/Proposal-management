ALTER TABLE "ProductVersion"
ADD COLUMN "name" TEXT,
ADD COLUMN "categoryName" TEXT,
ADD COLUMN "janCode" TEXT,
ADD COLUMN "modelNumber" TEXT,
ADD COLUMN "features" JSONB,
ADD COLUMN "minLot" INTEGER,
ADD COLUMN "leadTime" TEXT;
