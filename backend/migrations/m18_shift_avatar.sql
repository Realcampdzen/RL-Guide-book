-- Добавление колонки avatar_url в таблицу shifts для хранения аватарок смен
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS avatar_url TEXT;
