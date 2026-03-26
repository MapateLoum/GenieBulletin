/*
  Warnings:

  - You are about to drop the column `coef` on the `matieres` table. All the data in the column will be lost.
  - You are about to drop the column `groupeNom` on the `matieres` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "matieres" DROP COLUMN "coef",
DROP COLUMN "groupeNom";
