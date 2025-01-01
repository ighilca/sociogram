-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create collaborations table
CREATE TABLE IF NOT EXISTS collaborations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source UUID REFERENCES team_members(id) ON DELETE CASCADE,
    target UUID REFERENCES team_members(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 4),
    direction TEXT NOT NULL CHECK (direction IN ('outgoing', 'incoming')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT different_members CHECK (source != target)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_collaborations_source ON collaborations(source);
CREATE INDEX IF NOT EXISTS idx_collaborations_target ON collaborations(target);
CREATE INDEX IF NOT EXISTS idx_collaborations_timestamp ON collaborations(timestamp);

-- Create view for average collaboration scores
CREATE OR REPLACE VIEW collaboration_scores AS
SELECT 
    m.id,
    m.label,
    m.role,
    m.department,
    COALESCE(AVG(c.score)::NUMERIC(10,2), 0) as avg_score,
    COUNT(c.id) as total_collaborations
FROM 
    team_members m
LEFT JOIN 
    collaborations c ON (m.id = c.source OR m.id = c.target)
GROUP BY 
    m.id, m.label, m.role, m.department;

-- Insert sample data with proper UUIDs
DO $$ 
DECLARE
    user1_id UUID := uuid_generate_v4();
    user2_id UUID := uuid_generate_v4();
    user3_id UUID := uuid_generate_v4();
BEGIN
    -- Insert team members
    INSERT INTO team_members (id, label, role, department) VALUES
        (user1_id, 'John Doe', 'Developer', 'Engineering'),
        (user2_id, 'Jane Smith', 'Designer', 'Design'),
        (user3_id, 'Bob Johnson', 'Manager', 'Management');

    -- Insert collaborations
    INSERT INTO collaborations (source, target, score, direction, timestamp) VALUES
        (user1_id, user2_id, 3, 'outgoing', NOW()),
        (user2_id, user3_id, 4, 'outgoing', NOW()),
        (user3_id, user1_id, 2, 'outgoing', NOW());
END $$; 