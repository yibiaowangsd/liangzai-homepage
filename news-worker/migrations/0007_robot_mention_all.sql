-- Expand the reminder choice without dropping the parent table or its histories.
-- The old column's own CHECK moves with the rename and is removed with that column.
ALTER TABLE robot_subscribers RENAME COLUMN mention_mode TO mention_mode_previous;
ALTER TABLE robot_subscribers ADD COLUMN mention_mode TEXT NOT NULL DEFAULT 'none'
  CHECK (mention_mode IN ('none', 'members', 'all'));
UPDATE robot_subscribers SET mention_mode = mention_mode_previous;
ALTER TABLE robot_subscribers DROP COLUMN mention_mode_previous;
