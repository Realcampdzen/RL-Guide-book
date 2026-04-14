-- Таблица для проектов Движка

CREATE TABLE IF NOT EXISTS engine_projects (
    _id VARCHAR(50) PRIMARY KEY,
    team_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    plan TEXT,
    "targetBadgeId" VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft',
    reflection TEXT,
    scenario TEXT,
    "submittedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engine_projects_team ON engine_projects(team_id);
