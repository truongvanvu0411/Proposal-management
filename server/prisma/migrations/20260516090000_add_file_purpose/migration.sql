ALTER TABLE "File" ADD COLUMN "purpose" TEXT;

CREATE INDEX "File_ownerType_ownerId_purpose_idx" ON "File"("ownerType", "ownerId", "purpose");
