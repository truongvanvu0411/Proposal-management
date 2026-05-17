ALTER TABLE "ProjectProduct"
ADD COLUMN "companyProductCode" TEXT,
ADD COLUMN "adoptionDate" TIMESTAMP(3),
ADD COLUMN "allowPublish" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "allowOrder" BOOLEAN NOT NULL DEFAULT false;
