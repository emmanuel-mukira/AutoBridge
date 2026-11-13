CREATE TABLE "WeeklySalesCapacity" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "weekStart" DATE NOT NULL,
  "availableMinutes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WeeklySalesCapacity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WeeklySalesCapacity_availableMinutes_check" CHECK ("availableMinutes" >= 0 AND "availableMinutes" <= 4800 AND "availableMinutes" % 15 = 0)
);

CREATE UNIQUE INDEX "WeeklySalesCapacity_userId_weekStart_key" ON "WeeklySalesCapacity"("userId", "weekStart");
ALTER TABLE "WeeklySalesCapacity" ADD CONSTRAINT "WeeklySalesCapacity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
