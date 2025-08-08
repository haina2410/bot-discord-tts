ALTER TABLE "public"."server_profiles" ADD "ignoring_channels" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "public"."server_profiles" ADD "listening_channels" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "public"."server_profiles" ADD "command_prefix" TEXT NOT NULL DEFAULT '!';
