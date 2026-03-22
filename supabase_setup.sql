-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Create the prayers table
CREATE TABLE IF NOT EXISTS prayers (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    day INTEGER NOT NULL,
    type_idx INTEGER NOT NULL,
    completed INTEGER DEFAULT 0,
    UNIQUE(year, month, day, type_idx)
);

-- 2. Enable Row Level Security
ALTER TABLE prayers ENABLE ROW LEVEL SECURITY;

-- 3. Allow anyone with the anon key to read and write (single-user app)
CREATE POLICY "Allow public read" ON prayers FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON prayers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON prayers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON prayers FOR DELETE USING (true);
