CREATE TABLE "public"."blocks"("chain" text NOT NULL, "block_num" integer NOT NULL, "block_id" integer NOT NULL, "timestamp" timestamptz NOT NULL, "producer" text NOT NULL, PRIMARY KEY ("chain","block_num") );
