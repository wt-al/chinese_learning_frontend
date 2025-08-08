import axios, { AxiosResponse } from 'axios';
import {
  AuthResponse,
  RegisterData,
  Collection,
  Scene,
  Sentence,
  UserProgress,
  ProgressUpdate,
  CheckResult,
  AnswerCheck,
  ContinueResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(async (config) => {
  // 优先使用Supabase token
  try {
    const { supabase } = await import('../lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
      return config;
    }
  } catch (error) {
    console.warn('Failed to get Supabase token:', error);
  }
  
  // 回退到localStorage token
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export class ApiService {

  static async login(email: string, password: string): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await api.post('/auth/login', {
      email,
      password
    });
    return response.data;
  }

  static async register(userData: RegisterData): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await api.post('/auth/register', userData);
    return response.data;
  }

  static async googleLogin(token: string): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await api.post('/auth/google', { token });
    return response.data;
  }

  static async getCollections(): Promise<Collection[]> {
    const response: AxiosResponse<{collections: Collection[]} | Collection[]> = await api.get('/collections');
    // Handle different response formats from backend
    if (response.data && typeof response.data === 'object' && 'collections' in response.data) {
      return response.data.collections;
    }
    return response.data as Collection[];
  }

  static async getCollectionById(id: number): Promise<Collection> {
    const response: AxiosResponse<Collection> = await api.get(`/collections/${id}`);
    return response.data;
  }

  static async getScenesByCollection(collectionId: number): Promise<Scene[]> {
    const response: AxiosResponse<{scenes: Scene[]} | Scene[]> = await api.get(`/collections/${collectionId}/scenes`);
    // Handle different response formats from backend
    if (response.data && typeof response.data === 'object' && 'scenes' in response.data) {
      return response.data.scenes;
    }
    return response.data as Scene[];
  }

  static async getScenes(): Promise<Scene[]> {
    const response: AxiosResponse<{scenes: Scene[]} | Scene[]> = await api.get('/scenes');
    // Handle different response formats from backend
    if (response.data && typeof response.data === 'object' && 'scenes' in response.data) {
      return response.data.scenes;
    }
    return response.data as Scene[];
  }

  static async getSceneById(id: number): Promise<Scene> {
    const response: AxiosResponse<Scene> = await api.get(`/scenes/${id}`);
    return response.data;
  }

  static async getSentence(id: number): Promise<Sentence> {
    const response: AxiosResponse<Sentence> = await api.get(`/sentences/${id}`);
    return response.data;
  }

  static async getBatchSentences(ids: number[]): Promise<Sentence[]> {
    const response: AxiosResponse<Sentence[]> = await api.post('/sentences/batch', { ids });
    return response.data;
  }

  static async checkAnswer(data: AnswerCheck): Promise<CheckResult> {
    const response: AxiosResponse<CheckResult> = await api.post('/check', data);
    return response.data;
  }

  static async getUserProgress(): Promise<UserProgress[]> {
    const response: AxiosResponse<{ progress_list: UserProgress[] }> = await api.get('/user/scene-progress');
    return response.data.progress_list;
  }

  static async getSceneProgress(sceneId: number): Promise<UserProgress> {
    const response: AxiosResponse<UserProgress> = await api.get(`/user/scene-progress/${sceneId}`);
    return response.data;
  }

  static async updateProgress(data: ProgressUpdate): Promise<void> {
    await api.post('/user/scene-progress', data);
  }

  static async continueLearning(sceneId: number): Promise<ContinueResponse> {
    const response: AxiosResponse<ContinueResponse> = await api.get(`/scenes/${sceneId}/continue`);
    return response.data;
  }

  static async restartScene(sceneId: number): Promise<void> {
    await api.post(`/user/scene-progress/${sceneId}/restart`);
  }

  static async searchDictionary(word: string): Promise<any> {
    const response = await api.get(`/dict?word=${encodeURIComponent(word)}`);
    return response.data;
  }
}