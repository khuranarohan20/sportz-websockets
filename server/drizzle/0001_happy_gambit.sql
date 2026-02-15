ALTER TABLE "commentary" ALTER COLUMN "tags" SET DATA TYPE text[] USING tags::text[];--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "commentary_match_id_idx" ON "commentary" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "commentary_match_sequence_idx" ON "commentary" USING btree ("match_id","minute","sequence");