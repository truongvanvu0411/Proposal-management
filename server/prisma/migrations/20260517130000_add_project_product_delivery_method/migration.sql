CREATE TYPE "ProjectProductDeliveryMethod" AS ENUM ('WAREHOUSE', 'DIRECT');

ALTER TABLE "ProjectProduct"
ADD COLUMN "deliveryMethod" "ProjectProductDeliveryMethod" NOT NULL DEFAULT 'WAREHOUSE';
