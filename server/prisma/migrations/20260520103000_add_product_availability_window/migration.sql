ALTER TABLE "Product"
  ADD COLUMN "availableFrom" TIMESTAMP(3),
  ADD COLUMN "availableTo" TIMESTAMP(3);

CREATE INDEX "Product_availableFrom_idx" ON "Product"("availableFrom");
CREATE INDEX "Product_availableTo_idx" ON "Product"("availableTo");
