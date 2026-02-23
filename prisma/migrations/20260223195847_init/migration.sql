-- CreateTable
CREATE TABLE "Superpower" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "tools" TEXT NOT NULL DEFAULT '[]',
    "scripts" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "basePrompt" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "SuperpowerOnAgents" (
    "agentId" TEXT NOT NULL,
    "superpowerId" TEXT NOT NULL,

    PRIMARY KEY ("agentId", "superpowerId"),
    CONSTRAINT "SuperpowerOnAgents_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SuperpowerOnAgents_superpowerId_fkey" FOREIGN KEY ("superpowerId") REFERENCES "Superpower" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
