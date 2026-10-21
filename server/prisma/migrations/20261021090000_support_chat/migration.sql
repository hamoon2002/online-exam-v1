CREATE TABLE "SupportThread" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'waiting',
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SupportThread_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SupportMessage" (
 "id" TEXT NOT NULL, "threadId" TEXT NOT NULL, "clientId" TEXT NOT NULL,
 "fromStaff" BOOLEAN NOT NULL DEFAULT false, "body" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupportThread_userId_key" ON "SupportThread"("userId");
CREATE INDEX "SupportThread_status_updatedAt_idx" ON "SupportThread"("status", "updatedAt");
CREATE UNIQUE INDEX "SupportMessage_threadId_clientId_key" ON "SupportMessage"("threadId", "clientId");
CREATE INDEX "SupportMessage_threadId_createdAt_idx" ON "SupportMessage"("threadId", "createdAt");
ALTER TABLE "SupportThread" ADD CONSTRAINT "SupportThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "SupportThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
