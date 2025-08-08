import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { 
  AppState, 
  User, 
  Collection, 
  Scene, 
  StepContent, 
  SessionStatistics, 
  UserSceneProgress,
  ModalState,
  Notification,
  CompletionModalData,
  ConfirmModalData
} from '../types';

type AppAction = 
  // Authentication
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  
  // Collections
  | { type: 'FETCH_COLLECTIONS_REQUEST' }
  | { type: 'FETCH_COLLECTIONS_SUCCESS'; payload: Collection[] }
  | { type: 'FETCH_COLLECTIONS_ERROR'; payload: string }
  | { type: 'SET_CURRENT_COLLECTION'; payload: Collection | null }
  
  // Scenarios
  | { type: 'FETCH_SCENES_REQUEST' }
  | { type: 'FETCH_SCENES_SUCCESS'; payload: Scene[] }
  | { type: 'FETCH_SCENES_ERROR'; payload: string }
  | { type: 'SET_CURRENT_SCENE'; payload: Scene | null }
  
  // Learning Session
  | { type: 'START_LEARNING_SESSION'; payload: { scene: Scene; startTime: Date; sessionStats: SessionStatistics } }
  | { type: 'LOAD_STEP'; payload: StepContent }
  | { type: 'UPDATE_USER_ANSWER'; payload: string }
  | { type: 'SUBMIT_ANSWER'; payload: { correct: boolean; timeSpent: number } }
  | { type: 'NEXT_STEP' }
  | { type: 'SHOW_HINT'; payload: boolean }
  | { type: 'COMPLETE_SCENARIO'; payload: CompletionModalData }
  | { type: 'RESTART_SCENE' }
  | { type: 'UPDATE_SESSION_STATS'; payload: Partial<SessionStatistics> }
  
  // User Progress
  | { type: 'UPDATE_USER_PROGRESS'; payload: UserSceneProgress }
  | { type: 'SET_USER_PROGRESS'; payload: UserSceneProgress | null }
  
  // UI State
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'SHOW_COMPLETION_MODAL'; payload: CompletionModalData }
  | { type: 'HIDE_COMPLETION_MODAL' }
  | { type: 'SHOW_CONFIRM_MODAL'; payload: ConfirmModalData }
  | { type: 'HIDE_CONFIRM_MODAL' };

const initialState: AppState = {
  user: {
    isAuthenticated: !!localStorage.getItem('token'),
    userInfo: null,
    token: localStorage.getItem('token')
  },
  collections: {
    list: [],
    currentCollection: null,
    loading: false
  },
  scenes: {
    list: [],
    currentScene: null,
    loading: false
  },
  game: {
    currentStep: 0,
    totalSteps: 0,
    currentContent: null,
    userProgress: null,
    isPlaying: false,
    startTime: null,
    sessionStats: {
      totalSteps: 0,
      completedSteps: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      hintsUsed: 0,
      startTime: new Date(),
      timeSpent: 0,
      accuracy: 0
    },
    showHint: false,
    userAnswer: ''
  },
  ui: {
    isLoading: false,
    error: null,
    notifications: [],
    modals: {
      completionModal: {
        isOpen: false,
        data: undefined
      },
      confirmModal: {
        isOpen: false,
        data: undefined
      }
    }
  }
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // Authentication
    case 'LOGIN_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        user: {
          isAuthenticated: true,
          userInfo: action.payload.user,
          token: action.payload.token
        }
      };
    
    case 'LOGOUT':
      localStorage.removeItem('token');
      return {
        ...state,
        user: {
          isAuthenticated: false,
          userInfo: null,
          token: null
        }
      };
    
    // Collections
    case 'FETCH_COLLECTIONS_REQUEST':
      return {
        ...state,
        collections: { ...state.collections, loading: true }
      };
    
    case 'FETCH_COLLECTIONS_SUCCESS':
      return {
        ...state,
        collections: {
          ...state.collections,
          list: action.payload,
          loading: false
        },
        ui: { ...state.ui, error: null }
      };
    
    case 'FETCH_COLLECTIONS_ERROR':
      return {
        ...state,
        collections: { ...state.collections, loading: false },
        ui: { ...state.ui, error: action.payload }
      };
    
    case 'SET_CURRENT_COLLECTION':
      return {
        ...state,
        collections: {
          ...state.collections,
          currentCollection: action.payload
        }
      };
    
    // Scenarios
    case 'FETCH_SCENES_REQUEST':
      return {
        ...state,
        scenes: { ...state.scenes, loading: true }
      };
    
    case 'FETCH_SCENES_SUCCESS':
      return {
        ...state,
        scenes: {
          ...state.scenes,
          list: action.payload,
          loading: false
        }
      };
    
    case 'FETCH_SCENES_ERROR':
      return {
        ...state,
        scenes: { ...state.scenes, loading: false },
        ui: { ...state.ui, error: action.payload }
      };
    
    case 'SET_CURRENT_SCENE':
      return {
        ...state,
        scenes: {
          ...state.scenes,
          currentScene: action.payload
        }
      };
    
    // Learning Session
    case 'START_LEARNING_SESSION':
      return {
        ...state,
        scenes: {
          ...state.scenes,
          currentScene: action.payload.scene
        },
        game: {
          ...state.game,
          currentStep: 0,
          totalSteps: action.payload.sessionStats.totalSteps,
          startTime: action.payload.startTime,
          sessionStats: action.payload.sessionStats,
          showHint: false,
          userAnswer: ''
        }
      };
    
    case 'LOAD_STEP':
      return {
        ...state,
        game: {
          ...state.game,
          currentContent: action.payload,
          currentStep: action.payload.stepIndex,
          showHint: false,
          userAnswer: ''
        }
      };
    
    case 'UPDATE_USER_ANSWER':
      return {
        ...state,
        game: {
          ...state.game,
          userAnswer: action.payload
        }
      };
    
    case 'SUBMIT_ANSWER':
      const newStats = {
        ...state.game.sessionStats,
        completedSteps: state.game.sessionStats.completedSteps + 1,
        correctAnswers: action.payload.correct 
          ? state.game.sessionStats.correctAnswers + 1 
          : state.game.sessionStats.correctAnswers,
        incorrectAnswers: !action.payload.correct 
          ? state.game.sessionStats.incorrectAnswers + 1 
          : state.game.sessionStats.incorrectAnswers,
        timeSpent: state.game.sessionStats.timeSpent + action.payload.timeSpent,
        accuracy: Math.round(
          ((action.payload.correct ? state.game.sessionStats.correctAnswers + 1 : state.game.sessionStats.correctAnswers) / 
           (state.game.sessionStats.completedSteps + 1)) * 100
        )
      };
      
      return {
        ...state,
        game: {
          ...state.game,
          sessionStats: newStats
        }
      };
    
    case 'NEXT_STEP':
      return {
        ...state,
        game: {
          ...state.game,
          currentStep: state.game.currentStep + 1,
          userAnswer: '',
          showHint: false
        }
      };
    
    case 'SHOW_HINT':
      return {
        ...state,
        game: {
          ...state.game,
          showHint: action.payload,
          sessionStats: action.payload && !state.game.showHint
            ? { ...state.game.sessionStats, hintsUsed: state.game.sessionStats.hintsUsed + 1 }
            : state.game.sessionStats
        }
      };
    
    case 'COMPLETE_SCENARIO':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            completionModal: {
              isOpen: true,
              data: action.payload
            }
          }
        }
      };
    
    case 'RESTART_SCENE':
      return {
        ...state,
        game: {
          ...initialState.game,
          startTime: new Date(),
          sessionStats: {
            ...initialState.game.sessionStats,
            startTime: new Date()
          }
        }
      };
    
    case 'UPDATE_SESSION_STATS':
      return {
        ...state,
        game: {
          ...state.game,
          sessionStats: {
            ...state.game.sessionStats,
            ...action.payload
          }
        }
      };
    
    // User Progress
    case 'UPDATE_USER_PROGRESS':
    case 'SET_USER_PROGRESS':
      return {
        ...state,
        game: {
          ...state.game,
          userProgress: action.payload
        }
      };
    
    // UI State
    case 'SET_LOADING':
      return {
        ...state,
        ui: { ...state.ui, isLoading: action.payload }
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        ui: { ...state.ui, error: action.payload }
      };
    
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [...state.ui.notifications, action.payload]
        }
      };
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter(n => n.id !== action.payload)
        }
      };
    
    case 'SHOW_COMPLETION_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            completionModal: {
              isOpen: true,
              data: action.payload
            }
          }
        }
      };
    
    case 'HIDE_COMPLETION_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            completionModal: {
              isOpen: false,
              data: undefined
            }
          }
        }
      };
    
    case 'SHOW_CONFIRM_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            confirmModal: {
              isOpen: true,
              data: action.payload
            }
          }
        }
      };
    
    case 'HIDE_CONFIRM_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            confirmModal: {
              isOpen: false,
              data: undefined
            }
          }
        }
      };
    
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}