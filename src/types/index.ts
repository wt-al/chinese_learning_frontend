// Core User Types
export interface User {
  id: number;
  username: string;
  email: string;
  provider: string;
  google_id?: string;
}

// Collections & Scenarios
export interface Collection {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  category: string;
  created_at: string;
  updated_at: string;
  scene_count?: number;
}

export interface Scene {
  id: number;
  name: string;
  category: string;
  collection_id: number;
  sentence_ids: number[]; // Simplified: only array format
  created_at: string;
  updated_at: string;
  estimated_time?: number; // minutes
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
}

// Learning Content
export interface Sentence {
  id: number;
  chinese: string;
  english: string;
  audio: string;
  mapping: PhraseMapping[];
}

export interface PhraseMapping {
  en: string;
  zh: string;
  phrase_id: number;
  pinyin?: string;
  audio?: string;
}

export interface Phrase {
  id: number;
  text: string;
  pinyin: string;
  audio_url: string;
}

// Learning Session
export interface StepContent {
  type: 'phrase' | 'sentence';
  english: string;
  chinese: string;
  pinyin: string;
  audio: string;
  stepIndex: number;
  totalSteps: number;
  sentenceId: number;
  isLastInSentence: boolean;
  isLastInScene: boolean;
}

export interface SessionStatistics {
  totalSteps: number;
  completedSteps: number;
  correctAnswers: number;
  incorrectAnswers: number;
  hintsUsed: number;
  startTime: Date;
  timeSpent: number; // seconds
  accuracy: number; // percentage
}

export interface CompletionStats {
  scene_id: number;
  time_taken: number;
  accuracy: number;
  mistakes_count: number;
  hints_used: number;
  completed_at: string;
}

// User Progress
export interface UserSceneProgress {
  id: number;
  user_id: number;
  scene_id: number;
  current_sentence_index: number;
  total_sentences: number;
  is_completed: boolean;
  completion_time_seconds?: number;
  started_at: string;
  completed_at?: string;
  last_studied_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserProgress {
  scene_id: number;
  scene_name: string;
  scene_category: string;
  current_sentence_index: number;
  total_sentences: number;
  progress_percentage: number;
  is_completed: boolean;
  completion_time_seconds?: number;
  completion_time_formatted?: string;
  started_at: string;
  completed_at?: string;
  last_studied_at: string;
}

// UI State
export interface ModalState {
  completionModal: {
    isOpen: boolean;
    data?: CompletionModalData;
  };
  confirmModal: {
    isOpen: boolean;
    data?: ConfirmModalData;
  };
}

export interface CompletionModalData {
  sceneName: string;
  collectionName: string;
  statistics: SessionStatistics;
  nextSceneId?: number;
  collectionProgress: {
    completed: number;
    total: number;
  };
}

export interface ConfirmModalData {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// App State
export interface AppState {
  user: {
    isAuthenticated: boolean;
    userInfo: User | null;
    token: string | null;
  };
  collections: {
    list: Collection[];
    currentCollection: Collection | null;
    loading: boolean;
  };
  scenes: {
    list: Scene[];
    currentScene: Scene | null;
    loading: boolean;
  };
  game: {
    currentStep: number;
    totalSteps: number;
    currentContent: StepContent | null;
    userProgress: UserSceneProgress | null;
    isPlaying: boolean;
    startTime: Date | null;
    sessionStats: SessionStatistics;
    showHint: boolean;
    userAnswer: string;
  };
  ui: {
    isLoading: boolean;
    error: string | null;
    notifications: Notification[];
    modals: ModalState;
  };
}

// API Types
export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface ProgressUpdate {
  scene_id: number;
  sentence_index: number;
  completed: boolean;
}

export interface CheckResult {
  correct: boolean;
  message: string;
  suggestions?: string[];
}

export interface AnswerCheck {
  sentence_id: number;
  user_answer: string;
}

export interface AnswerSubmission {
  sentence_id: number;
  user_answer: string;
  step_index: number;
  time_taken: number;
}

export interface ValidationResult {
  correct: boolean;
  message: string;
  expected_answer: string;
  suggestions?: string[];
  similarity_score?: number;
}

export interface SessionData {
  scene: Scene;
  sentences: Sentence[];
  totalSteps: number;
  userProgress?: UserSceneProgress;
}

export interface ContinueResponse {
  scene_id: number;
  scene_name: string;
  current_sentence_index: number;
  current_sentence: Sentence;
  remaining_sentences: number;
  total_sentences: number;
}

// Constants
export const CATEGORIES = ['Daily', 'Beginner', 'Business', 'Travel'] as const;
export type Category = typeof CATEGORIES[number];

export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];