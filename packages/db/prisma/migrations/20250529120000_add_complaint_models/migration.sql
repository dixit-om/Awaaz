-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ComplaintPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "MediaUploadStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "complaint_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaint_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "assignedAuthorityId" TEXT,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'SUBMITTED',
    "priority" "ComplaintPriority" NOT NULL DEFAULT 'MEDIUM',
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "address" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_media" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "durationSec" INTEGER,
    "uploadStatus" "MediaUploadStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_status_history" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "previousStatus" "ComplaintStatus",
    "newStatus" "ComplaintStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "complaint_categories_slug_key" ON "complaint_categories"("slug");

-- CreateIndex
CREATE INDEX "complaints_citizenId_idx" ON "complaints"("citizenId");

-- CreateIndex
CREATE INDEX "complaints_assignedAuthorityId_idx" ON "complaints"("assignedAuthorityId");

-- CreateIndex
CREATE INDEX "complaints_status_idx" ON "complaints"("status");

-- CreateIndex
CREATE INDEX "complaints_categoryId_idx" ON "complaints"("categoryId");

-- CreateIndex
CREATE INDEX "complaints_createdAt_idx" ON "complaints"("createdAt");

-- CreateIndex
CREATE INDEX "complaints_isPublic_status_idx" ON "complaints"("isPublic", "status");

-- CreateIndex
CREATE INDEX "complaint_media_complaintId_idx" ON "complaint_media"("complaintId");

-- CreateIndex
CREATE INDEX "complaint_status_history_complaintId_createdAt_idx" ON "complaint_status_history"("complaintId", "createdAt");

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "complaint_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assignedAuthorityId_fkey" FOREIGN KEY ("assignedAuthorityId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_media" ADD CONSTRAINT "complaint_media_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_status_history" ADD CONSTRAINT "complaint_status_history_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_status_history" ADD CONSTRAINT "complaint_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
