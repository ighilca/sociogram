-- Ajouter la colonne email à la table team_members
ALTER TABLE team_members
ADD COLUMN email TEXT;

-- Ajouter une contrainte d'unicité sur l'email
CREATE UNIQUE INDEX idx_team_members_email ON team_members(email)
WHERE email IS NOT NULL;

-- Ajouter une contrainte de format email
ALTER TABLE team_members
ADD CONSTRAINT valid_email 
CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'); 