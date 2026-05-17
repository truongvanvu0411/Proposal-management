CREATE TABLE "ProductChangeRequest" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "requestedByName" TEXT,
    "targetVersion" INTEGER NOT NULL,
    "beforeSnapshot" JSONB NOT NULL,
    "afterSnapshot" JSONB NOT NULL,
    "changedFields" JSONB NOT NULL,
    "imageChanges" JSONB,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductChangeRequest_productId_status_idx" ON "ProductChangeRequest"("productId", "status");
CREATE INDEX "ProductChangeRequest_createdAt_idx" ON "ProductChangeRequest"("createdAt");

ALTER TABLE "ProductChangeRequest" ADD CONSTRAINT "ProductChangeRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
