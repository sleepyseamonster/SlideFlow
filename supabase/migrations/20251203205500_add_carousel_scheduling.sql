/*
  # Add Carousel Scheduling Support

  1. New Columns
    - `scheduled_at` (timestamptz, nullable) - When the carousel is scheduled to be posted
    - `posting_status` (text) - Current status of the carousel posting process

  2. Changes
    - Add `scheduled_at` column to `carousel` table
    - Add `posting_status` column with default 'draft'
    - Add check constraint for valid posting_status values

  3. Security
    - No RLS changes needed (inherits existing carousel policies)
*/

-- Add scheduled_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carousel' AND column_name = 'scheduled_at'
  ) THEN
    ALTER TABLE carousel ADD COLUMN scheduled_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Add posting_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carousel' AND column_name = 'posting_status'
  ) THEN
    ALTER TABLE carousel ADD COLUMN posting_status text DEFAULT 'draft';
  END IF;
END $$;

-- Add check constraint for posting_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'carousel_posting_status_check'
  ) THEN
    ALTER TABLE carousel
    ADD CONSTRAINT carousel_posting_status_check
    CHECK (posting_status IN ('draft', 'scheduled', 'posted', 'failed'));
  END IF;
END $$;