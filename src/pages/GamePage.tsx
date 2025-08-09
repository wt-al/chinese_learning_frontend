import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { useAuth } from '../hooks/useAuth';
import { ApiService } from '../services/api';
import { CompletionModal } from '../components/modals/CompletionModal';
import { Sentence, PhraseMapping, StepContent, SessionStatistics, CompletionModalData } from '../types';

export function GamePage() {
  const { sceneId } = useParams<{ sceneId: string }>();
  const { state, dispatch } = useAppContext();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [currentSentences, setCurrentSentences] = useState<Sentence[]>([]);
  const [allSteps, setAllSteps] = useState<StepContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [stepStartTime, setStepStartTime] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [displayTime, setDisplayTime] = useState('00:00:00');
  const [lastActivityTime, setLastActivityTime] = useState(new Date());
  const [pausedTime, setPausedTime] = useState(0); // Total paused time in seconds
  const isStoppedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Input method composition state
  const [isComposing, setIsComposing] = useState(false);
  const [confirmedText, setConfirmedText] = useState('');
  
  // Hint state: 0 = hidden, 1 = show pinyin, 2 = show chinese
  const [hintState, setHintState] = useState<0 | 1 | 2>(0);
  
  // Focus state for cursor blinking
  const [isFocused, setIsFocused] = useState(false);
  
  // Speed feedback state
  const [speedFeedback, setSpeedFeedback] = useState<{
    rating: 'excellent' | 'great' | 'good' | 'normal' | null;
    show: boolean;
  }>({ rating: null, show: false });
  
  // State to track if we're waiting for user to press Enter to complete the final step
  const [waitingForFinalConfirmation, setWaitingForFinalConfirmation] = useState(false);
  
  // Audio control
  const [lastPlayedStepIndex, setLastPlayedStepIndex] = useState<number | null>(null);
  const [audioWaveStage, setAudioWaveStage] = useState<2 | 0 | 1>(2); // 2: default with waves, 0: no waves when playing, 1: one wave, 2: two waves
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Create typing sound audio instance
  const typingSound = new Audio('https://pub-db47198bc7c9439a8a89961773b1d1cd.r2.dev/elements/typing.DR9dleQv.mp3');
  typingSound.volume = 1.0; // Set volume to 100%
  
  // Create delete sound audio instance (using same sound for now, can be changed to different sound)
  const deleteSound = new Audio('https://pub-db47198bc7c9439a8a89961773b1d1cd.r2.dev/elements/typing.DR9dleQv.mp3');
  deleteSound.volume = 1.0;
  deleteSound.playbackRate = 0.8; // Slightly slower playback for delete to differentiate
  
  // Create success sound audio instance
  const successSound = new Audio('https://pub-db47198bc7c9439a8a89961773b1d1cd.r2.dev/elements/successed.mp3');
  successSound.volume = 0.7;
  
  // Create completion sound audio instance
  const completionSound = new Audio('https://pub-db47198bc7c9439a8a89961773b1d1cd.r2.dev/elements/goodresult.mp3');
  completionSound.volume = 0.8;

  useEffect(() => {
    if (sceneId) {
      loadSceneData(parseInt(sceneId));
    }
  }, [sceneId]);

  // Load the initial step when allSteps is populated
  useEffect(() => {
    if (allSteps.length > 0 && state.game.currentStep >= 0 && allSteps[state.game.currentStep]) {
      const step = state.game.currentStep;
      console.log('Loading step:', step, 'from allSteps:', allSteps.length);
      const stepContent = allSteps[step];
      console.log('Step content:', stepContent);
      dispatch({ type: 'LOAD_STEP', payload: stepContent });
      setStepStartTime(new Date());
      // Reset input states for new step
      setConfirmedText('');
      setIsComposing(false);
      setHintState(0); // Reset hint state for new step
      setIsFocused(false); // Reset focus state for new step
      setSpeedFeedback({ rating: null, show: false }); // Clear speed feedback for new step
      
      // Auto-play audio when loading a truly new step (not the same step again)
      if (lastPlayedStepIndex !== step) {
        setLastPlayedStepIndex(step);
        setTimeout(() => {
          playAudio(stepContent.audio);
        }, 500); // Small delay to ensure content is loaded
      }
      
      // Auto-focus input when step loads
      setTimeout(() => {
        inputRef.current?.focus();
        setIsFocused(true);
      }, 600); // Focus after audio starts
    }
  }, [allSteps, state.game.currentStep, dispatch, lastPlayedStepIndex]);

  const loadSceneData = async (id: number) => {
    try {
      setIsLoading(true);
      setLastPlayedStepIndex(null); // Reset audio tracking for new scene
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

      // Determine the starting step based on user progress
      let startStep = 0;
      const isAuthenticated = !!user || !!session;
      if (isAuthenticated) {
        try {
          const userProgress = await ApiService.getSceneProgress(id);
          startStep = Math.max(0, Math.min(userProgress.current_sentence_index || 0, steps.length - 1));
        } catch (error) {
          console.warn('Could not load user progress, starting from beginning:', error);
        }
      }

      dispatch({
        type: 'START_LEARNING_SESSION',
        payload: { 
          scene, 
          startTime, 
          sessionStats,
          startStep 
        }
      });
      
      // Load the appropriate step
      if (steps.length > 0 && steps[startStep]) {
        dispatch({ type: 'LOAD_STEP', payload: steps[startStep] });
      }
      
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
    
    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    
    // Reset wave stage to allow new playback
    if (audioWaveStage !== 2) {
      setAudioWaveStage(2);
    }
    
    const audio = new Audio(url);
    currentAudioRef.current = audio; // Store reference to current audio
    
    // Start wave animation sequence: go from no waves to progressively more waves
    setAudioWaveStage(0); // Start with no waves
    
    const waveTimeout1 = setTimeout(() => {
      setAudioWaveStage(1); // Show first wave after 200ms
    }, 200);
    
    const waveTimeout2 = setTimeout(() => {
      setAudioWaveStage(2); // Show second wave after 600ms
    }, 600);
    
    const resetToDefault = () => {
      clearTimeout(waveTimeout1);
      clearTimeout(waveTimeout2);
      setAudioWaveStage(2); // Return to default state with waves
      // Clear the audio reference when playback ends
      if (currentAudioRef.current === audio) {
        currentAudioRef.current = null;
      }
    };
    
    audio.addEventListener('ended', resetToDefault);
    audio.addEventListener('error', resetToDefault);
    audio.addEventListener('pause', () => {
      // Also reset when audio is paused (stopped by user)
      if (currentAudioRef.current === audio) {
        resetToDefault();
      }
    });
    
    audio.play().catch((error) => {
      console.error('Audio play error:', error);
      resetToDefault();
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit called', {
      userAnswer: state.game.userAnswer,
      currentContent: state.game.currentContent,
      isComposing: isComposing
    });
    
    // Only process submission if user has input and not composing
    if (!state.game.userAnswer.trim() || !state.game.currentContent || isComposing) {
      console.log('Submission blocked:', {
        noAnswer: !state.game.userAnswer.trim(),
        noContent: !state.game.currentContent,
        isComposing: isComposing
      });
      return;
    }

    // Clear any existing feedback when resubmitting
    if (feedback) {
      setFeedback(null);
    }

    const timeSpent = Math.floor((new Date().getTime() - stepStartTime.getTime()) / 1000);

    // Frontend validation - compare user answer with expected Chinese text (excluding punctuation)
    const userAnswer = state.game.userAnswer.trim();
    const expectedAnswer = state.game.currentContent.chinese;
    
    // Extract only Chinese characters for comparison (exclude punctuation and spaces)
    const userChineseOnly = userAnswer.replace(/[，。！？；：、""''（）【】《》\s]/g, '');
    const expectedChineseOnly = expectedAnswer.replace(/[，。！？；：、""''（）【】《》\s]/g, '');
    
    console.log('Validation Debug:');
    console.log('User input:', userAnswer);
    console.log('Expected:', expectedAnswer);
    console.log('User Chinese only:', userChineseOnly);
    console.log('Expected Chinese only:', expectedChineseOnly);
    
    const isCorrect = userChineseOnly === expectedChineseOnly;
    
    const result = {
      correct: isCorrect,
      message: isCorrect ? 'Correct! Well done!' : 'Not quite right. Please check the red-marked characters and try again!'
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
      // Calculate speed rating for correct answers
      const chineseCharCount = expectedChineseOnly.length;
      const speedRating = calculateSpeedRating(timeSpent, chineseCharCount);
      
      // Show speed feedback for good performance
      showSpeedFeedback(speedRating);
      
      // Play success sound when answer is correct
      successSound.currentTime = 0;
      successSound.play().catch(console.error);
      
      // Save progress immediately after each correct answer
      const isAuthenticated = !!user || !!session;
      console.log('Authentication check:', {
        isAuthenticated: isAuthenticated,
        supabaseUser: user,
        supabaseSession: !!session,
        contextUser: state.user,
        sceneId: sceneId
      });
      
      if (isAuthenticated && sceneId) {
        // Find the current sentence index based on sentenceId
        const currentSentenceId = state.game.currentContent?.sentenceId;
        const sentenceIndex = currentSentences.findIndex(s => s.id === currentSentenceId);
        
        console.log('Saving progress after correct answer:', {
          currentStep: state.game.currentStep,
          sentenceId: currentSentenceId,
          sentenceIndex: sentenceIndex,
          sceneId: parseInt(sceneId),
          isAuthenticated: state.user.isAuthenticated
        });
        
        // Use sentence index or fallback to calculating from current step
        let progressIndex = sentenceIndex;
        if (progressIndex === -1) {
          // Calculate approximate sentence index from step progress
          const stepsPerSentence = Math.ceil(state.game.totalSteps / currentSentences.length);
          progressIndex = Math.floor(state.game.currentStep / stepsPerSentence);
        }
        
        const progressData = {
          scene_id: parseInt(sceneId),
          sentence_index: progressIndex,
          completed: false // Will be set to true when scene is completed
        };
        
        console.log('Sending progress data:', progressData);
        
        ApiService.updateProgress(progressData).then(response => {
          console.log('Progress saved successfully:', response);
        }).catch(error => {
          console.error('Failed to save progress:', error.response || error);
          if (error.response) {
            console.error('Error details:', {
              status: error.response.status,
              data: error.response.data,
              headers: error.response.headers
            });
          }
        });
      }
      
      // Check if this is the final step
      const isFinalStep = state.game.currentStep >= state.game.totalSteps - 1;
      
      if (isFinalStep) {
        // For final step, wait for user confirmation
        setWaitingForFinalConfirmation(true);
        setTimeout(() => {
          inputRef.current?.focus();
          setIsFocused(true);
        }, 100);
      } else {
        // For non-final steps, proceed as usual
        setTimeout(() => {
          nextStep();
        }, 1500);
      }
    } else {
      // If answer is incorrect, refocus input for user to try again
      setTimeout(() => {
        inputRef.current?.focus();
        setIsFocused(true);
      }, 100);
    }
  };

  const nextStep = () => {
    // Stop any playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    dispatch({ type: 'UPDATE_USER_ANSWER', payload: '' });
    dispatch({ type: 'SHOW_HINT', payload: false });
    setFeedback(null);
    setConfirmedText(''); // Clear confirmed text for next step
    setIsComposing(false); // Reset composition state
    setAudioWaveStage(2); // Reset to default state with waves
    setHintState(0); // Reset hint state to hidden
    setIsFocused(false); // Reset focus state
    setSpeedFeedback({ rating: null, show: false }); // Clear speed feedback
    setWaitingForFinalConfirmation(false); // Reset final confirmation state
    
    if (state.game.currentStep < state.game.totalSteps - 1) {
      dispatch({ type: 'NEXT_STEP' });
      // Step loading will be handled by the useEffect watching state.game.currentStep
    } else {
      completeScene();
    }
  };

  const completeScene = () => {
    const isAuthenticated = !!user || !!session;
    if (isAuthenticated && sceneId && state.scenes.currentScene) {
      // Mark the scene as completed with the final sentence index
      ApiService.updateProgress({
        scene_id: parseInt(sceneId),
        sentence_index: currentSentences.length - 1,
        completed: true
      }).catch(error => {
        console.error('Failed to mark scene as completed:', error);
      });
    }
    
    // Play completion success music
    completionSound.currentTime = 0;
    completionSound.play().catch(console.error);
    
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

  const toggleHint = () => {
    // Cycle through states: hidden(0) -> pinyin(1) -> chinese(2) -> hidden(0)
    setHintState((prev) => {
      const nextState = (prev + 1) % 3;
      // Also update the old state for compatibility
      dispatch({ type: 'SHOW_HINT', payload: nextState > 0 });
      return nextState as 0 | 1 | 2;
    });
  };

  // Function to get pinyin for each character position
  const getPinyinForCharacter = (charIndex: number): string => {
    if (!state.game.currentContent || hintState !== 1) return '';
    
    const currentContent = state.game.currentContent;
    const chineseText = currentContent.chinese;
    
    // Skip punctuation characters
    const char = chineseText[charIndex];
    if (/[，。！？；：、""''（）【】《》]/.test(char)) return '';
    
    // Count Chinese characters before this position (excluding punctuation)
    const chineseCharsBefore = chineseText.slice(0, charIndex).replace(/[，。！？；：、""''（）【】《》]/g, '').length;
    
    // For phrase-based content, get pinyin from mapping
    if (currentContent.type === 'phrase') {
      return currentContent.pinyin || '';
    }
    
    // For sentence-based content, extract from the combined pinyin
    if (currentContent.pinyin) {
      const pinyinArray = currentContent.pinyin.split(' ').filter(p => p.trim());
      return pinyinArray[chineseCharsBefore] || '';
    }
    
    return '';
  };

  // Function to get chinese character for display
  const getChineseForCharacter = (charIndex: number): string => {
    if (!state.game.currentContent || hintState !== 2) return '';
    
    const currentContent = state.game.currentContent;
    const chineseText = currentContent.chinese;
    
    return chineseText[charIndex] || '';
  };

  // Function to check if this position is the cursor position
  const isCursorPosition = (index: number): boolean => {
    if (!isFocused || !state.game.currentContent) return false;
    
    const chineseText = state.game.currentContent.chinese;
    const char = chineseText[index];
    const isPunctuation = /[，。！？；：、""''（）【】《》]/.test(char);
    
    if (isPunctuation) return false;
    
    // Count Chinese characters before this position in the expected answer
    const chineseCharsBefore = chineseText.slice(0, index).replace(/[，。！？；：、""''（）【】《》]/g, '').length || 0;
    // Count confirmed Chinese characters in user input
    const confirmedChineseCount = (isComposing ? confirmedText : state.game.userAnswer).replace(/[，。！？；：、""''（）【】《》\s]/g, '').length;
    // This is cursor position if no display character and it's the next input position
    const displayText = isComposing ? confirmedText : state.game.userAnswer;
    const userChineseOnly = displayText.replace(/[，。！？；：、""''（）【】《》\s]/g, '');
    const userChar = userChineseOnly[chineseCharsBefore] || '';
    
    return !userChar && chineseCharsBefore === confirmedChineseCount;
  };

  // Function to check if character at this position is incorrect
  const isCharacterIncorrect = (index: number): boolean => {
    if (!state.game.currentContent || !feedback || feedback.correct) return false;
    
    const chineseText = state.game.currentContent.chinese;
    const char = chineseText[index];
    const isPunctuation = /[，。！？；：、""''（）【】《》]/.test(char);
    
    if (isPunctuation) return false;
    
    // Count Chinese characters before this position in the expected answer
    const chineseCharsBefore = chineseText.slice(0, index).replace(/[，。！？；：、""''（）【】《》]/g, '').length || 0;
    // Get the expected character at this position
    const expectedChineseOnly = chineseText.replace(/[，。！？；：、""''（）【】《》]/g, '');
    const expectedChar = expectedChineseOnly[chineseCharsBefore] || '';
    
    // Get user input character at this position
    const displayText = isComposing ? confirmedText : state.game.userAnswer;
    const userChineseOnly = displayText.replace(/[，。！？；：、""''（）【】《》\s]/g, '');
    const userChar = userChineseOnly[chineseCharsBefore] || '';
    
    // Return true if user has input a character that doesn't match expected
    return userChar && userChar !== expectedChar;
  };

  const getElapsedTime = () => {
    // If stopped, return the frozen display time
    if (isStopped) return displayTime;
    
    if (!state.game.startTime) return '00:00:00';
    
    // Calculate current elapsed time
    let diff = Math.max(0, Math.floor((currentTime.getTime() - state.game.startTime.getTime()) / 1000));
    // Subtract paused time from total elapsed time
    diff = Math.max(0, diff - pausedTime);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (state.game.totalSteps === 0) return 0;
    return Math.round(((state.game.currentStep + 1) / state.game.totalSteps) * 100);
  };

  const handlePause = () => {
    // Record the time when pausing to calculate paused duration later
    setLastActivityTime(new Date());
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
    // Stop any playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    // Reset all timing states
    setIsStopped(false);
    setIsPaused(false);
    setDisplayTime('00:00:00');
    setPausedTime(0);
    setLastActivityTime(new Date());
    isStoppedRef.current = false;
    
    // Reset game states
    setFeedback(null);
    setConfirmedText('');
    setIsComposing(false);
    setAudioWaveStage(2);
    setHintState(0);
    setSpeedFeedback({ rating: null, show: false });
    setWaitingForFinalConfirmation(false);
    
    // Restart the learning session from the beginning
    if (state.scenes.currentScene && allSteps.length > 0) {
      const newStartTime = new Date();
      const newSessionStats: SessionStatistics = {
        totalSteps: allSteps.length,
        completedSteps: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        hintsUsed: 0,
        startTime: newStartTime,
        timeSpent: 0,
        accuracy: 0
      };
      
      dispatch({ 
        type: 'START_LEARNING_SESSION', 
        payload: { 
          scene: state.scenes.currentScene, 
          startTime: newStartTime, 
          sessionStats: newSessionStats,
          startStep: 0  // Always restart from step 0
        }
      });
      
      // Load the first step
      dispatch({ type: 'LOAD_STEP', payload: allSteps[0] });
      dispatch({ type: 'UPDATE_USER_ANSWER', payload: '' });
      
      // Reset step start time
      setStepStartTime(newStartTime);
      
      // Auto-focus input
      setTimeout(() => {
        inputRef.current?.focus();
        setIsFocused(true);
      }, 100);
    }
  };

  const handleResume = () => {
    const pauseStartTime = lastActivityTime.getTime();
    const resumeTime = new Date().getTime();
    const additionalPausedTime = Math.floor((resumeTime - pauseStartTime) / 1000);
    setPausedTime(prev => prev + additionalPausedTime);
    setIsPaused(false);
    setLastActivityTime(new Date());
    
    // Focus input when resuming
    setTimeout(() => {
      inputRef.current?.focus();
      setIsFocused(true);
    }, 100);
  };

  const trackActivity = () => {
    setLastActivityTime(new Date());
  };

  // Ensure input has focus, set focus if it doesn't
  const ensureFocus = () => {
    if (!isFocused) {
      inputRef.current?.focus();
      setIsFocused(true);
    }
    trackActivity();
  };

  // Calculate typing speed and return rating
  const calculateSpeedRating = (timeSpent: number, charCount: number): 'excellent' | 'great' | 'good' | 'normal' => {
    if (timeSpent <= 0 || charCount <= 0) return 'normal';
    
    // Calculate characters per second
    const charsPerSecond = charCount / timeSpent;
    // Calculate characters per 5 seconds (based on user's requirement: 5s for 10 chars = excellent)
    const charsPer5Seconds = charsPerSecond * 5;
    
    if (charsPer5Seconds >= 10) { // 10+ chars in 5s = excellent (2+ chars/second)
      return 'excellent';
    } else if (charsPer5Seconds >= 8) { // 8-9 chars in 5s = great
      return 'great';
    } else if (charsPer5Seconds >= 6) { // 6-7 chars in 5s = good
      return 'good';
    } else {
      return 'normal';
    }
  };

  // Show speed feedback with animation
  const showSpeedFeedback = (rating: 'excellent' | 'great' | 'good' | 'normal') => {
    if (rating === 'normal') return; // Don't show feedback for normal speed
    
    setSpeedFeedback({ rating, show: true });
    
    // Hide feedback after 2 seconds
    setTimeout(() => {
      setSpeedFeedback({ rating: null, show: false });
    }, 2000);
  };

  const handleCompletionModalContinue = () => {
    dispatch({ type: 'HIDE_COMPLETION_MODAL' });
    // TODO: Navigate to next scenario
    navigate(`/collection/${state.collections.currentCollection?.id || ''}`);
  };

  const handleCompletionModalReview = () => {
    dispatch({ type: 'HIDE_COMPLETION_MODAL' });
    dispatch({ type: 'RESTART_SCENE' });
    // No need to navigate with step index, the useEffect will handle loading step 0
  };

  const handleCompletionModalBackToCollection = () => {
    dispatch({ type: 'HIDE_COMPLETION_MODAL' });
    navigate(`/collection/${state.collections.currentCollection?.id || ''}`);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "'") {
        e.preventDefault();
        ensureFocus();
        playAudio();
      } else if (e.ctrlKey && e.key === ';') {
        e.preventDefault();
        ensureFocus();
        toggleHint();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        
        // If waiting for final confirmation, complete the scene immediately
        if (waitingForFinalConfirmation) {
          completeScene();
          return;
        }
        
        // For normal steps, ensure focus and handle submission
        ensureFocus();
        // Play audio before submitting
        playAudio();
        // Small delay to let audio start, then submit
        setTimeout(() => {
          const form = document.querySelector('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }, 100);
      } else if (e.key === ' ' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Space key: only for input method composition, don't auto-submit
        // Let the input method handle the space key naturally
        if (!isComposing) {
          // If not composing, prevent space from being added to input
          e.preventDefault();
          ensureFocus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [state.game.currentContent, state.game.userAnswer, waitingForFinalConfirmation, isComposing]);

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

  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

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
      <div className="min-h-screen bg-slate-50 flex flex-col relative">
        {/* Top Navigation Bar */}
        <div className="bg-white border-b border-slate-100">
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
              <div className="flex items-center text-sm text-slate-500 space-x-1">
                <span className="text-emerald-600 font-medium">{state.game.sessionStats.correctAnswers}</span>
                <span>correct</span>
                <span className="mx-2 text-slate-300">•</span>
                <span className="text-emerald-600 font-medium">{state.game.sessionStats.accuracy}%</span>
                <span>accuracy</span>
              </div>
              
              {/* Timer Control Buttons */}
              <div className="flex items-center space-x-2">
                {!isPaused && !isStopped ? (
                  <button
                    onClick={handlePause}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                    title="Pause Timer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                    </svg>
                  </button>
                ) : isPaused ? (
                  <button
                    onClick={handleResume}
                    className="p-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors duration-200"
                    title="Resume Timer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                    </svg>
                  </button>
                ) : null}
                
                
                <button
                  onClick={handleRestart}
                  className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                  title="Restart Session"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              </div>
              
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

        {/* Progress Bar below navigation bar */}
        <div className="bg-white border-b border-slate-50">
          <div className="h-1 bg-slate-100">
            <div 
              className="h-1 bg-emerald-600 transition-all duration-500 ease-out"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {/* Timer Display below navigation bar */}
        <div className="absolute top-24 right-4 z-10">
          <div className="flex items-center text-base text-slate-700">
            <svg className="w-7 h-7 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <circle cx="12" cy="13" r="8"/>
              <path d="M5 3L2 6l1.5 1.5"/>
              <path d="M22 6l-3-3-1.5 1.5"/>
              <path d="M12 7v6l3 3"/>
            </svg>
            <span className="font-mono font-medium text-base tracking-wide">{getElapsedTime()}</span>
          </div>
        </div>


        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center items-center px-8 py-16">
          <div className="w-full max-w-3xl text-center">


            {/* English Text Display */}
            <div className="mb-12">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-slate-800 leading-relaxed mb-8 tracking-wide">
                {state.game.currentContent.english}
              </h2>
              
              {/* Audio Button */}
              <button
                onClick={() => {
                  ensureFocus();
                  playAudio();
                }}
                className="inline-flex items-center justify-center w-12 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
                title="Play Pronunciation"
                disabled={audioWaveStage !== 2}
              >
                <svg className="w-4 h-4 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  {/* Speaker base (always visible) */}
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.59-.79-1.59-1.76V9.98c0-.97.71-1.76 1.59-1.76h2.24z" />
                  
                  {/* First wave (visible when stage >= 1) */}
                  {audioWaveStage >= 1 && (
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="M16.463 8.288a5.25 5.25 0 010 7.424"
                      className="animate-pulse"
                    />
                  )}
                  
                  {/* Second wave (visible when stage >= 2) */}
                  {audioWaveStage >= 2 && (
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="M19.114 5.636a9 9 0 010 12.728"
                      className="animate-pulse"
                      style={{ animationDelay: '0.2s' }}
                    />
                  )}
                </svg>
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
              <div className="mb-8">
                {/* Hidden input for capturing typing */}
                <input
                  ref={inputRef}
                  type="text"
                  value={state.game.userAnswer}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    const oldValue = state.game.userAnswer;
                    
                    // Ensure focus and track activity
                    ensureFocus();
                    
                    // Always update the input value, but only update confirmed text when not composing
                    dispatch({ type: 'UPDATE_USER_ANSWER', payload: newValue });
                    
                    // Clear error feedback when user continues typing after an incorrect answer
                    if (feedback && !feedback.correct && newValue !== oldValue) {
                      setFeedback(null);
                    }
                    
                    if (!isComposing) {
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
                      
                      setConfirmedText(newValue);
                    }
                  }}
                  onCompositionStart={() => {
                    setIsComposing(true);
                  }}
                  onCompositionUpdate={() => {
                    // Do nothing while composing
                  }}
                  onCompositionEnd={(e) => {
                    setIsComposing(false);
                    const newValue = e.currentTarget.value;
                    
                    // Play typing sound when composition ends
                    if (!feedback?.correct && newValue.length > confirmedText.length) {
                      typingSound.currentTime = 0;
                      typingSound.play().catch(() => {});
                    }
                    
                    setConfirmedText(newValue);
                    dispatch({ type: 'UPDATE_USER_ANSWER', payload: newValue });
                  }}
                  onFocus={() => {
                    ensureFocus();
                  }}
                  onBlur={() => {
                    setIsFocused(false);
                  }}
                  onClick={() => {
                    ensureFocus();
                  }}
                  className="absolute opacity-0 pointer-events-none"
                  autoComplete="off"
                  disabled={feedback?.correct}
                />
                
                {/* Underline display with navigation arrows */}
                <div 
                  className="w-full px-8 py-6 pb-12 text-center cursor-text focus:outline-none relative"
                  onClick={() => {
                    ensureFocus();
                  }}
                  onFocus={() => {
                    ensureFocus();
                  }}
                  onBlur={() => {
                    setIsFocused(false);
                  }}
                  tabIndex={0}
                >
                  {/* Previous Step Arrow - Left */}
                  {state.game.currentStep > 0 && (
                    <button
                      onClick={() => {
                        dispatch({ type: 'UPDATE_USER_ANSWER', payload: '' });
                        dispatch({ type: 'SHOW_HINT', payload: false });
                        setFeedback(null);
                        setConfirmedText('');
                        setIsComposing(false);
                        setHintState(0);
                        setWaitingForFinalConfirmation(false);
                        dispatch({ type: 'PREVIOUS_STEP' });
                      }}
                      className="absolute left-0 top-1/2 transform -translate-y-1/2 p-4 text-slate-400 hover:text-emerald-600 transition-all duration-200 text-6xl"
                      title="Previous Step"
                    >
                      ⟨
                    </button>
                  )}

                  {/* Next Step Arrow - Right */}
                  {state.game.currentStep < state.game.totalSteps - 1 && (
                    <button
                      onClick={() => {
                        dispatch({ type: 'UPDATE_USER_ANSWER', payload: '' });
                        dispatch({ type: 'SHOW_HINT', payload: false });
                        setFeedback(null);
                        setConfirmedText('');
                        setIsComposing(false);
                        setHintState(0);
                        setWaitingForFinalConfirmation(false);
                        dispatch({ type: 'NEXT_STEP' });
                      }}
                      className="absolute right-0 top-1/2 transform -translate-y-1/2 p-4 text-slate-400 hover:text-emerald-600 transition-all duration-200 text-6xl"
                      title="Next Step"
                    >
                      ⟩
                    </button>
                  )}
                  <div className="flex justify-center items-center gap-2 flex-wrap">
                    {state.game.currentContent?.chinese.split('').map((char, index) => {
                      // Check if this character is punctuation
                      const isPunctuation = /[，。！？；：、""''（）【】《》]/.test(char);
                      
                      // Only show confirmed characters (not while composing pinyin)
                      const displayText = isComposing ? confirmedText : state.game.userAnswer;
                      
                      // For Chinese characters, map user input to correct position
                      let userChar = '';
                      if (!isPunctuation) {
                        // Count how many Chinese characters come before this position
                        const chineseCharsBefore = state.game.currentContent?.chinese.slice(0, index).replace(/[，。！？；：、""''（）【】《》]/g, '').length || 0;
                        // Get the corresponding character from user input (excluding punctuation)
                        const userChineseOnly = displayText.replace(/[，。！？；：、""''（）【】《》\s]/g, '');
                        userChar = userChineseOnly[chineseCharsBefore] || '';
                      }
                      
                      // Show punctuation directly, or user input for Chinese characters
                      const displayChar = isPunctuation ? char : userChar;
                      
                      return (
                        <div key={index} className="relative">
                          {/* Pinyin display above the underline - only for non-punctuation characters */}
                          {!isPunctuation && isComposing && state.game.userAnswer !== confirmedText && (() => {
                            // Count Chinese characters before this position in the expected answer
                            const chineseCharsBefore = state.game.currentContent?.chinese.slice(0, index).replace(/[，。！？；：、""''（）【】《》]/g, '').length || 0;
                            // Count confirmed Chinese characters in user input
                            const confirmedChineseCount = confirmedText.replace(/[，。！？；：、""''（）【】《》\s]/g, '').length;
                            // Show pinyin at the position where user should input next Chinese character
                            return chineseCharsBefore === confirmedChineseCount;
                          })() && (
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-blue-600 text-sm font-mono bg-blue-50 px-2 py-1 rounded whitespace-nowrap">
                              {state.game.userAnswer.replace(/[，。！？；：、""''（）【】《》\s]/g, '').slice(confirmedText.replace(/[，。！？；：、""''（）【】《》\s]/g, '').length)}
                            </div>
                          )}
                          
                          {/* Cursor display - show at the next input position only when focused */}
                          {isFocused && !isPunctuation && !displayChar && (() => {
                            // Count Chinese characters before this position in the expected answer
                            const chineseCharsBefore = state.game.currentContent?.chinese.slice(0, index).replace(/[，。！？；：、""''（）【】《》]/g, '').length || 0;
                            // Count confirmed Chinese characters in user input
                            const confirmedChineseCount = (isComposing ? confirmedText : state.game.userAnswer).replace(/[，。！？；：、""''（）【】《》\s]/g, '').length;
                            // Show cursor at the next position to input
                            return chineseCharsBefore === confirmedChineseCount;
                          })() && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-0.5 h-8 bg-emerald-500 animate-blink"></div>
                            </div>
                          )}
                          
                          <div className="w-12 h-16 flex items-center justify-center text-2xl font-medium">
                            {displayChar && (
                              <span className={`${
                                isPunctuation 
                                  ? 'text-slate-500' // Punctuation in gray
                                  : feedback?.correct 
                                    ? 'text-emerald-600' 
                                    : 'text-slate-800'
                              }`}>
                                {displayChar}
                              </span>
                            )}
                          </div>
                          <div className={`absolute bottom-2 left-0 right-0 h-0.5 ${
                            isPunctuation
                              ? 'bg-slate-400' // Different color for punctuation
                              : isCharacterIncorrect(index)
                                ? 'bg-red-500' // Red underline for incorrect characters
                                : displayChar 
                                  ? (feedback?.correct ? 'bg-emerald-500' : 'bg-emerald-500')
                                  : isCursorPosition(index)
                                    ? 'bg-emerald-500' // Green underline for cursor position when focused
                                    : 'bg-slate-300'
                          }`} />
                          
                          {/* Pinyin display below the underline */}
                          {!isPunctuation && hintState === 1 && getPinyinForCharacter(index) && (
                            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-blue-600 text-xs font-mono bg-blue-50 px-1 py-0.5 rounded whitespace-nowrap">
                              {getPinyinForCharacter(index)}
                            </div>
                          )}
                          
                          {/* Chinese character display below the underline */}
                          {hintState === 2 && getChineseForCharacter(index) && (
                            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-emerald-600 text-sm font-medium bg-emerald-50 px-2 py-1 rounded whitespace-nowrap border border-emerald-200">
                              {getChineseForCharacter(index)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {!state.game.currentContent?.chinese && (
                    <div className="text-slate-400 text-lg">等待加载题目...</div>
                  )}
                </div>
              </div>


              {/* Speed Feedback */}
              {speedFeedback.show && speedFeedback.rating && (
                <div className={`mb-4 p-4 rounded-2xl text-center transition-all duration-500 transform ${
                  speedFeedback.show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                } ${
                  speedFeedback.rating === 'excellent' 
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 text-orange-700 border border-orange-200' 
                    : speedFeedback.rating === 'great'
                    ? 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200'
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200'
                }`}>
                  <div className="flex items-center justify-center">
                    {speedFeedback.rating === 'excellent' && (
                      <>
                        <svg className="w-6 h-6 mr-2 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-lg font-bold">EXCELLENT!</span>
                        <svg className="w-6 h-6 ml-2 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </>
                    )}
                    {speedFeedback.rating === 'great' && (
                      <>
                        <svg className="w-6 h-6 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-lg font-bold">GREAT!</span>
                        <svg className="w-6 h-6 ml-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </>
                    )}
                    {speedFeedback.rating === 'good' && (
                      <>
                        <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-1a2 2 0 011-1.732V11a2 2 0 002-2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L11 1h2a2 2 0 012 2v5h-2m-7 15h2m-2 0v-5" />
                        </svg>
                        <span className="text-lg font-bold">GOOD!</span>
                        <svg className="w-6 h-6 ml-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-1a2 2 0 011-1.732V11a2 2 0 002-2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L11 1h2a2 2 0 012 2v5h-2m-7 15h2m-2 0v-5" />
                        </svg>
                      </>
                    )}
                  </div>
                  <div className="text-sm mt-1 opacity-80">
                    {speedFeedback.rating === 'excellent' && 'Lightning fast typing! 🚀'}
                    {speedFeedback.rating === 'great' && 'Impressive speed! 💨'}
                    {speedFeedback.rating === 'good' && 'Nice typing pace! 👍'}
                  </div>
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
                  {/* Show final confirmation hint only for correct answers on final step */}
                  {feedback.correct && waitingForFinalConfirmation && (
                    <div className="mt-3 pt-3 border-t border-emerald-200">
                      <div className="flex items-center justify-center text-sm text-emerald-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l3 3m0 0l3-3m-3 3v-8.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>🎉 Congratulations! Press <kbd className="px-2 py-1 bg-emerald-100 rounded text-xs font-mono">Enter</kbd> to complete</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  type="submit"
                  disabled={!waitingForFinalConfirmation && !state.game.userAnswer.trim()}
                  onClick={(e) => {
                    // If waiting for final confirmation, complete the scene directly
                    if (waitingForFinalConfirmation) {
                      e.preventDefault();
                      completeScene();
                      return;
                    }
                    
                    ensureFocus();
                    // Play audio before submitting
                    playAudio();
                  }}
                  className="px-12 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  {waitingForFinalConfirmation ? 'Complete Session' : 'Submit Answer'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    ensureFocus();
                    toggleHint();
                  }}
                  className="px-8 py-4 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all duration-200 font-medium"
                >
                  {hintState === 0 ? 'Hint' : hintState === 1 ? 'Show Answer' : 'Hide'}
                </button>
              </div>
            </form>

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
              <span>Cycle Hint</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pause Modal */}
      {isPaused && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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