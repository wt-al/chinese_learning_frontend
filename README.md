# Chinese Learning Platform Frontend

A React-based frontend application for learning Chinese through scenario-based interactive exercises.

## Features

- **Scenario-based Learning**: Learn Chinese through practical, real-world scenarios
- **Interactive Exercises**: Practice typing Chinese characters with real-time feedback
- **Audio Support**: Listen to native pronunciation for sentences and phrases
- **Progress Tracking**: Save learning progress for registered users
- **User Authentication**: Support for email/password and Google OAuth login
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Keyboard Shortcuts**: Quick access to common functions

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS
- **State Management**: React Context + useReducer
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Build Tool**: Vite
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_CDN_BASE_URL=https://cdn.studychinese.com
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/
│   ├── common/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── game/           # Game/learning interface components
│   └── scenes/         # Scene list components
├── pages/              # Page components
├── services/           # API services
├── store/              # State management
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Key Features

### Home Page
- Display available learning scenarios
- Filter by category (Daily, Business, Beginner)
- Show learning progress for authenticated users
- Responsive grid layout

### Game Page
- Clean, minimalist learning interface
- Step-by-step progression through phrases and sentences
- Real-time audio playback
- Answer verification with fuzzy matching
- Keyboard shortcuts for quick actions
- Progress tracking with visual indicators

### Authentication
- Email/password registration and login
- Google OAuth integration (placeholder)
- JWT token management
- Protected routes for user-specific features

### Progress Tracking
- Automatic progress saving for registered users
- Scene completion tracking
- Learning statistics and achievements
- Resume learning from last position

## API Integration

The frontend integrates with a Go backend API that provides:

- User authentication endpoints
- Scene and sentence data
- Progress tracking
- Answer verification
- Audio file URLs

## Keyboard Shortcuts

In the game interface:
- `Ctrl + '` - Play pronunciation
- `Enter` - Submit answer
- `Ctrl + ;` - Show correct answer

## Responsive Design

- **Desktop** (≥1024px): 3-4 column grid layout
- **Tablet** (768-1023px): 2 column grid layout  
- **Mobile** (<768px): Single column layout with optimized touch interaction

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow React best practices with functional components and hooks
- Use TailwindCSS for styling
- Implement proper error handling and loading states

### Component Structure
- Keep components focused and reusable
- Use proper TypeScript interfaces
- Implement loading and error states
- Follow accessibility best practices

### State Management
- Use React Context for global state
- Keep component state local when possible
- Implement proper action types and reducers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.