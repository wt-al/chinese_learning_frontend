import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { ApiService } from '../services/api';
import { CompletionModal } from '../components/modals/CompletionModal';
import { Sentence, PhraseMapping, StepContent, SessionStatistics, CompletionModalData } from '../types';

export function GamePage() {
  const { sceneId, stepIndex } = useParams<{ sceneId: string; stepIndex: string }>();
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [currentSentences, setCurrentSentences] = useState<Sentence[]>([]);
  const [allSteps, setAllSteps] = useState<StepContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [stepStartTime, setStepStartTime] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [displayTime, setDisplayTime] = useState('00:00');
  const [lastActivityTime, setLastActivityTime] = useState(new Date());
  const [pausedTime, setPausedTime] = useState(0); // Total paused time in seconds
  const isStoppedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create typing sound audio instance
  const typingSound = new Audio('https://pub-db47198bc7c9439a8a89961773b1d1cd.r2.dev/elements/typing.DR9dleQv.mp3');
  typingSound.volume = 1.0; // Set volume to 100%
  
  // Create delete sound audio instance (using same sound for now, can be changed to different sound)
  const deleteSound = new Audio('https://pub-db47198bc7c9439a8a89961773b1d1cd.r2.dev/elements/typing.DR9dleQv.mp3');
  deleteSound.volume = 1.0;
  deleteSound.playbackRate = 0.8; // Slightly slower playback for delete to differentiate

  useEffect(() => {
    if (sceneId) {
      loadSceneData(parseInt(sceneId));
    }
  }, [sceneId]);

  useEffect(() => {
    if (stepIndex !== undefined && allSteps.length > 0) {
      const step = parseInt(stepIndex);
      console.log('Loading step:', step, 'from allSteps:', allSteps.length);
      if (allSteps[step]) {
        console.log('Step content:', allSteps[step]);
        dispatch({ type: 'LOAD_STEP', payload: allSteps[step] });
        setStepStartTime(new Date());
      } else {
        console.error('Step not found:', step, 'allSteps:', allSteps);
      }
    }
  }, [stepIndex, allSteps, dispatch]);

  const loadSceneData = async (id: number) => {
    try {
      setIsLoading(true);
      console.log('Loading scene data for ID:', id);
      
      const scene = await ApiService.getSceneById(id);
      console.log('Loaded scene:', scene);
      
      // Now sentence_ids is a simple array
      const sentences = await ApiService.getBatchSentences(scene.sentence_ids);
      console.log('Loaded sentences:', sentences);
      console.log('Sentences type:', typeof sentences);
      console.log('Is sentences array:', Array.isArray(sentences));
      
      // Handle different response formats from backend
      let sentencesArray;
      if (Array.isArray(sentences)) {
        sentencesArray = sentences;
      } else if (sentences && typeof sentences === 'object' && 'sentences' in sentences) {
        sentencesArray = (sentences as any).sentences;
      } else if (sentences && typeof sentences === 'object' && 'data' in sentences) {
        sentencesArray = (sentences as any).data;
      } else {
        console.error('Unexpected sentences format:', sentences);
        return;
      }
      
      console.log('Final sentences array:', sentencesArray);
      setCurrentSentences(sentencesArray);

      const steps = generateSteps(sentencesArray);
      console.log('Generated steps:', steps);
      setAllSteps(steps);
      
      const startTime = new Date();
      const sessionStats: SessionStatistics = {
        totalSteps: steps.length,
        completedSteps: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        hintsUsed: 0,
        startTime,
        timeSpent: 0,
        accuracy: 0
      };

      dispatch({
        type: 'START_LEARNING_SESSION',
        payload: { 
          scene, 
          startTime, 
          sessionStats 
        }
      });
      
      // Initialize activity tracking
      setLastActivityTime(startTime);
    } catch (error) {
      console.error('Failed to load scene data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSteps = (sentences: any[]): StepContent[] => {
    const steps: StepContent[] = [];
    
    sentences.forEach((sentence, sentenceIndex) => {
      console.log('Processing sentence:', sentence);
      
      // Get data from sentence using backend field names
      const mapping = sentence.mapping || [];
      const englishText = sentence.english || '';
      const chineseText = sentence.chinese || '';
      const audioUrl = sentence.audio || '';
      
      console.log('Mapping array:', mapping, 'Length:', mapping.length);
      
      // Check if mapping exists and is an array
      if (!Array.isArray(mapping) || mapping.length === 0) {
        console.warn('Sentence missing or empty mapping:', sentence);
        // If no phrase mapping, just create a sentence step
        steps.push({
          type: 'sentence',
          english: englishText,
          chinese: chineseText,
          pinyin: '',
          audio: audioUrl,
          stepIndex: steps.length,
          totalSteps: 0,
          sentenceId: sentence.id,
          isLastInSentence: true,
          isLastInScene: sentenceIndex === sentences.length - 1
        });
        return;
      }
      
      // Add phrase steps
      mapping.forEach((phrase, phraseIndex) => {
        console.log(`Adding phrase ${phraseIndex + 1}/${mapping.length}:`, phrase);
        steps.push({
          type: 'phrase',
          english: phrase.en || phrase.english || '',
          chinese: phrase.zh || phrase.chinese || '',
          pinyin: phrase.pinyin || '',
          audio: phrase.audio || '',
          stepIndex: steps.length,
          totalSteps: 0, // Will be set after all steps are generated
          sentenceId: sentence.id,
          isLastInSentence: false,
          isLastInScene: false
        });
      });
      
      // Add complete sentence step
      console.log('Adding complete sentence step');
      steps.push({
        type: 'sentence',
        english: englishText,
        chinese: chineseText,
        pinyin: mapping.map(p => p.pinyin || '').filter(p => p).join(' '),
        audio: audioUrl,
        stepIndex: steps.length,
        totalSteps: 0,
        sentenceId: sentence.id,
        isLastInSentence: true,
        isLastInScene: sentenceIndex === sentences.length - 1
      });
    });

    // Update totalSteps for all steps
    steps.forEach(step => {
      step.totalSteps = steps.length;
    });
    
    console.log(`Generated ${steps.length} total steps from ${sentences.length} sentences`);
    console.log('All steps:', steps);

    return steps;
  };

  const playAudio = (audioUrl?: string) => {
    const url = audioUrl || state.game.currentContent?.audio;
    if (!url) return;
    
    const audio = new Audio(url);
    audio.play().catch(console.error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.game.userAnswer.trim() || !state.game.currentContent) return;

    const timeSpent = Math.floor((new Date().getTime() - stepStartTime.getTime()) / 1000);

    // Frontend validation - compare user answer with expected Chinese text
    const userAnswer = state.game.userAnswer.trim().replace(/\s+/g, ''); // Remove all spaces for comparison
    const expectedAnswer = state.game.currentContent.chinese.replace(/\s+/g, ''); // Remove all spaces for comparison
    
    const isCorrect = userAnswer === expectedAnswer;
    
    const result = {
      correct: isCorrect,
      message: isCorrect ? 'Correct! Well done!' : `Incorrect. The correct answer is: ${state.game.currentContent.chinese}`
    };
    
    setFeedback(result);
    
    dispatch({
      type: 'SUBMIT_ANSWER',
      payload: {
        correct: result.correct,
        timeSpent
      }
    });
    
    if (result.correct) {
      setTimeout(() => {
        nextStep();
      }, 1500);
    }
  };

  const nextStep = () => {
    dispatch({ type: 'UPDATE_USER_ANSWER', payload: '' });
    dispatch({ type: 'SHOW_HINT', payload: false });
    setFeedback(null);
    
    if (state.game.currentStep < state.game.totalSteps - 1) {
      dispatch({ type: 'NEXT_STEP' });
      navigate(`/game/${sceneId}/${state.game.currentStep + 1}`);
    } else {
      completeScene();
    }
  };

  const completeScene = () => {
    if (state.user.isAuthenticated && sceneId && state.scenes.currentScene) {
      ApiService.updateProgress({
        scene_id: parseInt(sceneId),
        sentence_index: currentSentences.length - 1,
        completed: true
      }).catch(console.error);
    }
    
    // Create completion modal data
    const completionData: CompletionModalData = {
      sceneName: state.scenes.currentScene?.name || 'Unknown Scenario',
      collectionName: state.collections.currentCollection?.name || 'Unknown Collection',
      statistics: state.game.sessionStats,
      nextSceneId: undefined, // TODO: Get next scene from collection
      collectionProgress: {
        completed: 0, // TODO: Calculate from user progress
        total: 0
      }
    };

    dispatch({ type: 'COMPLETE_SCENARIO', payload: completionData });
  };

  const toggleShowAnswer = () => {
    dispatch({ type: 'SHOW_HINT', payload: !state.game.showHint });
  };

  const getElapsedTime = () => {
    // If stopped, return the frozen display time
    if (isStopped) return displayTime;
    
    if (!state.game.startTime) return '00:00';
    
    // Calculate current elapsed time
    let diff = Math.max(0, Math.floor((currentTime.getTime() - state.game.startTime.getTime()) / 1000));
    // Subtract paused time from total elapsed time
    diff = Math.max(0, diff - pausedTime);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (state.game.totalSteps === 0) return 0;
    return Math.round(((state.game.currentStep + 1) / state.game.totalSteps) * 100);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleStop = () => {
    // Save current display time before stopping
    const currentDisplayTime = getElapsedTime();
    setDisplayTime(currentDisplayTime);
    
    setIsStopped(true);
    setIsPaused(false);
    isStoppedRef.current = true;
    
    // Clear the timer immediately
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleRestart = () => {
    setIsStopped(false);
    setIsPaused(false);
    setDisplayTime('00:00');
    setPausedTime(0);
    setLastActivityTime(new Date());
    isStoppedRef.current = false;
    
    if (state.scenes.currentScene) {
      dispatch({ 
        type: 'START_LEARNING_SESSION', 
        payload: { 
          scene: state.scenes.currentScene, 
          startTime: new Date(), 
          sessionStats: {
            ...state.game.sessionStats,
            startTime: new Date(),
            timeSpent: 0
          }
        }
      });
    }
  };

  const handleResume = () => {
    const pauseStartTime = lastActivityTime.getTime();
    const resumeTime = new Date().getTime();
    const additionalPausedTime = Math.floor((resumeTime - pauseStartTime) / 1000);
    setPausedTime(prev => prev + additionalPausedTime);
    setIsPaused(false);
    setLastActivityTime(new Date());
  };

  const trackActivity = () => {
    setLastActivityTime(new Date());
  };

  const handleCompletionModalContinue = () => {
    dispatch({ type: 'HIDE_COMPLETION_MODAL' });
    // TODO: Navigate to next scenario
    navigate(`/collection/${state.collections.currentCollection?.id || ''}`);
  };

  const handleCompletionModalReview = () => {
    dispatch({ type: 'HIDE_COMPLETION_MODAL' });
    dispatch({ type: 'RESTART_SCENE' });
    navigate(`/game/${sceneId}/0`);
  };

  const handleCompletionModalBackToCollection = () => {
    dispatch({ type: 'HIDE_COMPLETION_MODAL' });
    navigate(`/collection/${state.collections.currentCollection?.id || ''}`);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "'") {
        e.preventDefault();
        playAudio();
      } else if (e.ctrlKey && e.key === ';') {
        e.preventDefault();
        toggleShowAnswer();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [state.game.currentContent]);

  // Timer to update elapsed time every second - only run when game has started and not stopped
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Don't start timer if game hasn't started or is stopped
    if (!state.game.startTime || isStopped) {
      return;
    }
    
    timerRef.current = setInterval(() => {
      // Double-check stop status in callback
      if (isStoppedRef.current) {
        return;
      }
      
      const now = new Date();
      setCurrentTime(now);
      
      // Check for inactivity (auto-pause after 2 minutes)
      if (!isPaused) {
        const inactiveTime = Math.floor((now.getTime() - lastActivityTime.getTime()) / 1000);
        if (inactiveTime >= 120) { // 2 minutes = 120 seconds
          setIsPaused(true);
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.game.startTime, isPaused, isStopped, lastActivityTime]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!state.game.currentContent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 text-lg">No content available</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top Progress Bar */}
        <div className="bg-white border-b border-slate-100">
          <div className="h-1 bg-slate-100">
            <div 
              className="h-1 bg-emerald-600 transition-all duration-500 ease-out"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <button
                onClick={() => navigate(`/collection/${state.collections.currentCollection?.id}`)}
                className="flex items-center text-slate-600 hover:text-emerald-700 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-sm font-medium">{state.collections.currentCollection?.name}</span>
              </button>
              <span className="text-slate-300">›</span>
              <h1 className="text-lg font-medium text-slate-800">
                {state.scenes.currentScene?.name}
              </h1>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                {state.game.currentStep + 1}/{state.game.totalSteps}
              </span>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-sm text-slate-500 font-mono">⏱ {getElapsedTime()}</span>
              <div className="flex items-center text-sm text-slate-500 space-x-1">
                <span className="text-emerald-600 font-medium">{state.game.sessionStats.correctAnswers}</span>
                <span>correct</span>
                <span className="mx-2 text-slate-300">•</span>
                <span className="text-emerald-600 font-medium">{state.game.sessionStats.accuracy}%</span>
                <span>accuracy</span>
              </div>
              <button
                onClick={handlePause}
                className="text-slate-500 hover:text-emerald-600 transition-colors duration-200"
                title="Pause learning session"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                </svg>
              </button>
              {!isStopped ? (
                <button
                  onClick={handleStop}
                  className="text-slate-500 hover:text-red-600 transition-colors duration-200"
                  title="Stop timer completely"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleRestart}
                  className="text-slate-500 hover:text-emerald-600 transition-colors duration-200"
                  title="Restart timer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
                title="Exit learning session"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center items-center px-8 py-16">
          <div className="w-full max-w-3xl text-center">
            {/* Step Type Indicator */}
            <div className="mb-8">
              <span className={`inline-flex px-4 py-2 rounded-full text-xs font-medium tracking-wide uppercase ${
                state.game.currentContent.type === 'phrase' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {state.game.currentContent.type === 'phrase' ? 'Phrase' : 'Complete Sentence'}
              </span>
            </div>

            {/* English Text Display */}
            <div className="mb-12">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-slate-800 leading-relaxed mb-8 tracking-wide">
                {state.game.currentContent.english}
              </h2>
              
              {/* Audio Button */}
              <button
                onClick={() => {
                  trackActivity();
                  playAudio();
                }}
                className="inline-flex items-center px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 9H4a1 1 0 00-1 1v4a1 1 0 001 1h1.586l4.707 4.707C10.923 20.337 12 19.939 12 19V5c0-.939-1.077-1.337-1.707-.707L5.586 9z" />
                </svg>
                Play Pronunciation
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
              <div className="mb-8">
                <input
                  type="text"
                  value={state.game.userAnswer}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    const oldValue = state.game.userAnswer;
                    
                    // Track user activity
                    trackActivity();
                    
                    // Play different sounds based on input change
                    if (!feedback?.correct) {
                      if (newValue.length > oldValue.length) {
                        // User added characters - play typing sound
                        typingSound.currentTime = 0;
                        typingSound.play().catch(() => {});
                      } else if (newValue.length < oldValue.length) {
                        // User deleted characters - play delete sound
                        deleteSound.currentTime = 0;
                        deleteSound.play().catch(() => {});
                      }
                    }
                    
                    dispatch({ type: 'UPDATE_USER_ANSWER', payload: newValue });
                  }}
                  onFocus={trackActivity}
                  onClick={trackActivity}
                  placeholder="Type Chinese characters here..."
                  className="w-full px-8 py-6 text-xl text-center border border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all duration-200 bg-white shadow-sm"
                  autoComplete="off"
                  disabled={feedback?.correct}
                />
              </div>

              {/* Show Answer/Hint */}
              {state.game.showHint && (
                <div className="mb-8 p-8 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="text-3xl text-slate-800 mb-3 font-light">
                    {state.game.currentContent.chinese}
                  </div>
                  {state.game.currentContent.pinyin && (
                    <div className="text-lg text-emerald-700 font-mono tracking-wide">
                      {state.game.currentContent.pinyin}
                    </div>
                  )}
                </div>
              )}

              {/* Feedback */}
              {feedback && (
                <div className={`mb-8 p-6 rounded-2xl ${
                  feedback.correct 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                    : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  <div className="flex items-center">
                    {feedback.correct ? (
                      <svg className="w-6 h-6 mr-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 mr-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="font-medium">{feedback.message}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  type="submit"
                  disabled={!state.game.userAnswer.trim() || feedback?.correct}
                  onClick={trackActivity}
                  className="px-12 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  Submit Answer
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    trackActivity();
                    toggleShowAnswer();
                  }}
                  className="px-8 py-4 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all duration-200 font-medium"
                >
                  {state.game.showHint ? 'Hide Hint' : 'Show Hint'}
                </button>
              </div>
            </form>

            {/* Progress within current step */}
            <div className="mt-16">
              <div className="text-sm text-slate-500 mb-3 font-medium">
                Step Progress: {state.game.sessionStats.completedSteps} of {state.game.sessionStats.totalSteps} completed
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-md mx-auto">
                <div 
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${(state.game.sessionStats.completedSteps / state.game.sessionStats.totalSteps) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="bg-slate-800 text-slate-300 px-8 py-4">
          <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-8 text-sm">
            <div className="flex items-center">
              <kbd className="px-3 py-1.5 bg-slate-700 rounded-md text-xs mr-2 font-mono">Ctrl</kbd>
              <span className="text-slate-400">+</span>
              <kbd className="px-3 py-1.5 bg-slate-700 rounded-md text-xs mx-2 font-mono">'</kbd>
              <span>Play Audio</span>
            </div>
            <div className="flex items-center">
              <kbd className="px-3 py-1.5 bg-slate-700 rounded-md text-xs mr-2 font-mono">Enter</kbd>
              <span>Submit Answer</span>
            </div>
            <div className="flex items-center">
              <kbd className="px-3 py-1.5 bg-slate-700 rounded-md text-xs mr-2 font-mono">Ctrl</kbd>
              <span className="text-slate-400">+</span>
              <kbd className="px-3 py-1.5 bg-slate-700 rounded-md text-xs mx-2 font-mono">;</kbd>
              <span>Show/Hide Hint</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pause Modal */}
      {isPaused && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={trackActivity}>
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              {/* Pause Icon */}
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                </svg>
              </div>
              
              {/* Pause Text */}
              <h2 className="text-3xl font-light text-slate-800 mb-2">Paused</h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Take a moment to rest. Your progress has been saved.
              </p>
              
              {/* Resume Button */}
              <button
                onClick={handleResume}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-4 px-8 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                Resume Learning
              </button>
              
              {/* Exit Option */}
              <button
                onClick={() => navigate('/')}
                className="w-full mt-3 text-slate-500 hover:text-slate-700 font-medium py-2 transition-colors duration-200"
              >
                Exit to Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      <CompletionModal
        isOpen={state.ui.modals.completionModal.isOpen}
        data={state.ui.modals.completionModal.data}
        onClose={() => dispatch({ type: 'HIDE_COMPLETION_MODAL' })}
        onContinue={handleCompletionModalContinue}
        onReview={handleCompletionModalReview}
        onBackToCollection={handleCompletionModalBackToCollection}
      />
    </>
  );
}