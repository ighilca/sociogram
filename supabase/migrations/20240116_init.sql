-- Create team_members table
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create collaborations table
CREATE TABLE collaborations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source UUID REFERENCES team_members(id) NOT NULL,
    target UUID REFERENCES team_members(id) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 4),
    direction TEXT NOT NULL CHECK (direction IN ('outgoing', 'incoming')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT different_members CHECK (source != target)
);

-- Create indexes for better query performance
CREATE INDEX idx_collaborations_source ON collaborations(source);
CREATE INDEX idx_collaborations_target ON collaborations(target);
CREATE INDEX idx_collaborations_timestamp ON collaborations(timestamp);

-- Create view for average collaboration scores
CREATE VIEW collaboration_scores AS
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