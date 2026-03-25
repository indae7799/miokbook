ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_phone TEXT;

DO $$
DECLARE
  user_id_attnum smallint;
  user_id_fk_name text;
BEGIN
  SELECT attnum
    INTO user_id_attnum
  FROM pg_attribute
  WHERE attrelid = 'orders'::regclass
    AND attname = 'user_id'
    AND NOT attisdropped;

  IF user_id_attnum IS NOT NULL THEN
    SELECT conname
      INTO user_id_fk_name
    FROM pg_constraint
    WHERE conrelid = 'orders'::regclass
      AND contype = 'f'
      AND conkey = ARRAY[user_id_attnum];

    IF user_id_fk_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', user_id_fk_name);
    END IF;
  END IF;
END $$;

ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
