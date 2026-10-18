-- A loan's month can be given back in several times: no longer one row per month.
DROP INDEX "loan_repayments_loanId_slot_key";

-- CreateIndex
CREATE INDEX "loan_repayments_loanId_slot_idx" ON "loan_repayments"("loanId", "slot");
