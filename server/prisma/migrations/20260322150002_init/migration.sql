-- CreateTable
CREATE TABLE "Alarm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "repeat" TEXT NOT NULL DEFAULT 'once',
    "ringtoneName" TEXT NOT NULL DEFAULT 'Default',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "datetime" DATETIME NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Routine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RoutineStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routineId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "time" TEXT,
    "note" TEXT,
    CONSTRAINT "RoutineStep_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
