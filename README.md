# Sociogram

Une application de visualisation et d'évaluation des collaborations d'équipe utilisant Sigma.js et React.

## Fonctionnalités

- Visualisation interactive des relations de collaboration
- Évaluation des collaborations sur une échelle de 0 à 4
- Gestion des membres de l'équipe
- Analyse des collaborations et statistiques
- Interface brutalist design
- Drag & drop des nœuds pour personnaliser la visualisation

## Technologies utilisées

- React + TypeScript
- Sigma.js pour la visualisation de graphes
- Material-UI pour l'interface utilisateur
- Supabase pour la base de données

## Installation

1. Cloner le dépôt :
```bash
git clone https://github.com/VOTRE_USERNAME/sociogram.git
cd sociogram
```

2. Installer les dépendances :
```bash
npm install
```

3. Configurer les variables d'environnement :
- Copier `.env.example` vers `.env`
- Remplir les informations de connexion Supabase

4. Lancer l'application en développement :
```bash
npm run dev
```

## Structure du projet

- `/src/components` - Composants React
- `/src/types` - Types TypeScript
- `/src/lib` - Configuration des services externes
- `/supabase/migrations` - Scripts de migration de la base de données

## Contribution

1. Fork le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## License

MIT
