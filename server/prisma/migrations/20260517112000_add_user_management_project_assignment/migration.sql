-- AlterTable
ALTER TABLE "Project" ADD COLUMN "assignedSalesUserId" TEXT;

-- CreateIndex
CREATE INDEX "Project_assignedSalesUserId_idx" ON "Project"("assignedSalesUserId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_assignedSalesUserId_fkey" FOREIGN KEY ("assignedSalesUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
