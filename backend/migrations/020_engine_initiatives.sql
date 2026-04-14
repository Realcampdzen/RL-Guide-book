-- Таблица для инициатив Совета Лагеря / Движков

CREATE TABLE IF NOT EXISTS engine_initiatives (
    _id VARCHAR(50) PRIMARY KEY,
    team_id VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    votes INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engine_initiatives_team ON engine_initiatives(team_id);
