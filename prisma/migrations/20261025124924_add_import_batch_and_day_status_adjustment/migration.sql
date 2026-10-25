-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rowsJson" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "validRows" INTEGER NOT NULL,
    "createdCount" INTEGER,
    "updatedCount" INTEGER,
    "conflictCount" INTEGER,
    "duplicateCount" INTEGER,
    "invalidCount" INTEGER,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" DATETIME,
    CONSTRAINT "ImportBatch_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImportBatch_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DayStatusAdjustment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "previousStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "adjustedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DayStatusAdjustment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DayStatusAdjustment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DayStatusAdjustment_adjustedById_fkey" FOREIGN KEY ("adjustedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ImportBatch_classId_idx" ON "ImportBatch"("classId");

-- CreateIndex
CREATE INDEX "ImportBatch_uploadedById_idx" ON "ImportBatch"("uploadedById");

-- CreateIndex
CREATE INDEX "DayStatusAdjustment_studentId_date_idx" ON "DayStatusAdjustment"("studentId", "date");

-- CreateIndex
CREATE INDEX "DayStatusAdjustment_classId_date_idx" ON "DayStatusAdjustment"("classId", "date");
