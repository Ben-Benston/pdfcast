-- Migration 001: Create rooms table for Relay PDF on Neon Postgres
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "roomCode" VARCHAR(6) UNIQUE NOT NULL,
  "pdfUrl" TEXT NOT NULL,
  "pdfName" TEXT NOT NULL,
  "currentPage" INT NOT NULL DEFAULT 1,
  "zoomLevel" VARCHAR(10) NOT NULL DEFAULT 'fit',
  "scrollPosition" INT NOT NULL DEFAULT 0,
  "roomPassword" TEXT,
  "pdfData" BYTEA,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON public.rooms("roomCode");
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON public.rooms("createdAt");

-- Cleanup function to purge rooms older than 24 hours
CREATE OR REPLACE FUNCTION public.cleanup_expired_rooms()
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.rooms WHERE "createdAt" < now() - interval '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Optional pg_cron schedule if pg_cron extension is available on Neon
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('cleanup-expired-rooms-hourly');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule('cleanup-expired-rooms-hourly', '0 * * * *', 'SELECT public.cleanup_expired_rooms()');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;
