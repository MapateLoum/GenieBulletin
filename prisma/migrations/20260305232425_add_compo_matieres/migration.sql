-- DropIndex
DROP INDEX "matieres_niveau_div_idx";

-- AlterTable
ALTER TABLE "matieres" ADD COLUMN     "compo" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "matieres_niveau_div_compo_idx" ON "matieres"("niveau", "div", "compo");
