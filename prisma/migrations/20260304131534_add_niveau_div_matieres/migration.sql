/*
  Warnings:

  - Added the required column `div` to the `matieres` table without a default value. This is not possible if the table is not empty.
  - Added the required column `niveau` to the `matieres` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "matieres" ADD COLUMN     "div" TEXT NOT NULL,
ADD COLUMN     "niveau" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "matieres_niveau_div_idx" ON "matieres"("niveau", "div");
