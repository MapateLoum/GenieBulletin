/*
  Warnings:

  - You are about to drop the column `compo` on the `matieres` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "matieres_niveau_div_compo_idx";

-- AlterTable
ALTER TABLE "matieres" DROP COLUMN "compo";

-- CreateTable
CREATE TABLE "reset_tokens" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "matieres_niveau_div_idx" ON "matieres"("niveau", "div");
