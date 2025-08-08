ALTER TABLE "server_profiles" ADD COLUMN "ignoring_channels" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "server_profiles" ADD COLUMN "listening_channels" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "server_profiles" ADD COLUMN "command_prefix" TEXT NOT NULL DEFAULT '!';
