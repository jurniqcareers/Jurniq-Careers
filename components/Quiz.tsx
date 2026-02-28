
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { User, QuizQuestion, QuizResult, QuizRecommendation, RoadmapStep } from '../types';
import { generateQuizQuestions, generateQuizBasedRecommendations, generateImage, generateRoadmap, analyzeChildAptitude } from '../services/geminiService';
import { db } from '../services/firebaseService';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { trackEvent } from '../services/analyticsService';

interface QuizProps {
  user: User | null;
  onRequireAuth: () => void;
  onExit: () => void;
}

const Quiz: React.FC<QuizProps> = ({ user, onRequireAuth, onExit }) => {
  const location = useLocation();
  // Views: 'setup' | 'instructions' | 'quiz' | 'results' | 'path-selection' | 'recommendations' | 'low-score' | 'roadmap' | 'teacher-test-auth' | 'teacher-test-submitted'
  const [view, setView] = useState<'setup' | 'instructions' | 'quiz' | 'results' | 'path-selection' | 'recommendations' | 'low-score' | 'roadmap' | 'teacher-test-auth' | 'teacher-test-submitted'>('setup');
  const [loading, setLoading] = useState(() => new URLSearchParams(location.search).has('testId'));
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Teacher Test State
  const [teacherTestId, setTeacherTestId] = useState<string | null>(null);
  const [teacherTest, setTeacherTest] = useState<any>(null);
  const [testPassword, setTestPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // User Data from DB
  const [dbUser, setDbUser] = useState<{name?: string, profile_pic?: string} | null>(null);

  useEffect(() => {
      const fetchUserData = async () => {
          if (user?.uid) {
              try {
                  const docRef = doc(db, "users", user.uid);
                  const docSnap = await getDoc(docRef);
                  if (docSnap.exists()) {
                      setDbUser(docSnap.data() as any);
                  }
              } catch (err) {
                  console.error("Failed to fetch user data", err);
              }
          }
      };
      fetchUserData();
  }, [user]);

  // Check for testId in URL
  useEffect(() => {
      const params = new URLSearchParams(location.search);
      const tId = params.get('testId');
      if (tId) {
          setTeacherTestId(tId);
          fetchTeacherTest(tId);
      }
  }, [location]);

  const fetchTeacherTest = async (tId: string) => {
      setLoading(true);
      try {
          const docRef = doc(db, "tests", tId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.status === 'completed') {
                  setTeacherTest({ id: docSnap.id, ...data });
                  setView('teacher-test-submitted'); // Show submitted view instead of alerting and exiting
                  return;
              }
              setTeacherTest({ id: docSnap.id, ...data });
              setView('teacher-test-auth');
          } else {
              // Show error in UI instead of alert
              setAuthError("Test not found. Please check the link.");
              setView('teacher-test-auth'); // Reuse auth view to show error
          }
      } catch (e) {
          console.error(e);
          setAuthError("Error fetching test. Please try again.");
          setView('teacher-test-auth');
      } finally {
          setLoading(false);
      }
  };

  const handleTestAuth = (e: React.FormEvent) => {
      e.preventDefault();
      if (testPassword === teacherTest.password) {
          setQuestions(teacherTest.questions);
          setUserAnswers(new Array(teacherTest.questions.length).fill(null));
          setVisitedStatus(new Array(teacherTest.questions.length).fill('not-visited'));
          setCurrentQIndex(0);
          resetTimer();
          setStartTime(new Date());
          setView('quiz');
      } else {
          setAuthError('Incorrect Password');
      }
  };

  const displayName = dbUser?.name || user?.displayName || 'Student';
  const displayImage = dbUser?.profile_pic || user?.photoURL || "https://placehold.co/128x128/3BB0FF/FFFFFF?text=U";

  // Setup Data
  const [setupData, setSetupData] = useState({
    name: displayName,
    classLevel: '',
    stream: '',
    subStream: ''
  });

  // Update setupData name when dbUser loads
  useEffect(() => {
      if (displayName !== 'Student') {
          setSetupData(prev => ({ ...prev, name: displayName }));
      }
  }, [displayName]);

  // Quiz Data
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | string | null)[]>([]);
  const [visitedStatus, setVisitedStatus] = useState<('not-visited' | 'not-answered' | 'answered' | 'skipped')[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  
  // Timer
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Results
  const [result, setResult] = useState<QuizResult | null>(null);
  const [recommendations, setRecommendations] = useState<QuizRecommendation[]>([]);
  const [pathType, setPathType] = useState<'jobs' | 'studies'>('jobs');

  // Roadmap Data
  const [roadmapData, setRoadmapData] = useState<RoadmapStep[]>([]);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [selectedRecTitle, setSelectedRecTitle] = useState('');

  // --- 1. SETUP LOGIC ---
  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { onRequireAuth(); return; }
    trackEvent('quiz_setup_completed', { class: setupData.classLevel, stream: setupData.stream });
    setView('instructions');
  };

  const handleStartQuiz = async () => {
    setView('quiz');
    setLoading(true);
    
    // Construct context for AI
    let context = `The student is in ${setupData.classLevel}.`;
    if (['Class 11', 'Class 12'].includes(setupData.classLevel)) {
        context += ` Their selected stream is ${setupData.stream} ${setupData.subStream ? `(${setupData.subStream})` : ''}.`;
    } else {
        context += " They are in the 1-10 class range.";
    }

    const generatedQuestions = await generateQuizQuestions(context);
    if (generatedQuestions.length > 0) {
        setQuestions(generatedQuestions);
        setUserAnswers(new Array(generatedQuestions.length).fill(null));
        setVisitedStatus(new Array(generatedQuestions.length).fill('not-visited'));
        setCurrentQIndex(0);
        resetTimer();
        setStartTime(new Date());
        trackEvent('quiz_started');
    } else {
        alert("Failed to generate questions. Please try again.");
        setView('instructions');
    }
    setLoading(false);
  };

  // --- 2. QUIZ LOGIC ---
  
  useEffect(() => {
      if (view === 'quiz' && !loading && questions.length > 0) {
          startTimer();
      }
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [view, loading, currentQIndex]);

  const startTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(30);
      timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
              if (prev <= 1) {
                  moveToNext(true); // Auto-skip
                  return 30;
              }
              return prev - 1;
          });
      }, 1000);
  };

  const resetTimer = () => {
      setTimeLeft(30);
  };

  const handleOptionSelect = (optionIndex: number | string) => {
      const newAnswers = [...userAnswers];
      newAnswers[currentQIndex] = optionIndex;
      setUserAnswers(newAnswers);
      
      const newStatus = [...visitedStatus];
      newStatus[currentQIndex] = 'answered';
      setVisitedStatus(newStatus);
  };

  const handleClearResponse = () => {
      const newAnswers = [...userAnswers];
      newAnswers[currentQIndex] = null;
      setUserAnswers(newAnswers);

      const newStatus = [...visitedStatus];
      newStatus[currentQIndex] = 'not-answered';
      setVisitedStatus(newStatus);
  };

  const moveToNext = (autoSkip = false) => {
      const newStatus = [...visitedStatus];
      if (autoSkip && newStatus[currentQIndex] === 'not-visited') {
          newStatus[currentQIndex] = 'skipped';
          setVisitedStatus(newStatus);
      } else if (!autoSkip && newStatus[currentQIndex] === 'not-visited') {
           newStatus[currentQIndex] = userAnswers[currentQIndex] !== null ? 'answered' : 'not-answered';
           setVisitedStatus(newStatus);
      }

      if (currentQIndex < questions.length - 1) {
          setCurrentQIndex(prev => prev + 1);
          resetTimer();
      } else {
          handleSubmitQuiz();
      }
  };

  const handleSubmitQuiz = async () => {
      if (timerRef.current) clearInterval(timerRef.current);
      
      const endTime = new Date();
      const diffMs = endTime.getTime() - (startTime?.getTime() || endTime.getTime());
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      const timeTakenStr = `${diffMins} min ${diffSecs} sec`;

      let correct = 0;
      let skipped = 0;
      
      questions.forEach((q, idx) => {
          if (userAnswers[idx] === null || userAnswers[idx] === '') skipped++;
          else if (q.correctAnswerIndex !== undefined && userAnswers[idx] === q.correctAnswerIndex) correct++;
          else if (q.correctAnswerIndex === undefined && userAnswers[idx]) correct++; // Give point for written answer just so it doesn't penalize
      });

      const incorrect = questions.length - correct - skipped;
      const score = correct * 5; // Assuming 5 points per question
      const total = questions.length * 5;
      const percentage = total > 0 ? (score / total) * 100 : 0;
      
      // Teacher Test Submission Logic
      if (teacherTestId && teacherTest) {
          setIsSubmitting(true);
          try {
              // Calculate IQ Score (Simple estimation)
              // Base 70 + (percentage * 0.8) -> Range 70-150
              const iq = Math.round(70 + (percentage / 100) * 80);

              // Prepare answers for AI Analysis
              const answersForAI = questions.map((q, i) => ({
                  question: q.question,
                  answer: userAnswers[i] !== null && userAnswers[i] !== '' ? (typeof userAnswers[i] === 'number' && q.options ? q.options[userAnswers[i] as number] : userAnswers[i]) : "Skipped",
                  correct: q.correctAnswerIndex !== undefined ? userAnswers[i] === q.correctAnswerIndex : true
              }));

              const analysisResult = await analyzeChildAptitude(
                  answersForAI, 
                  teacherTest.studentClass || 'Unknown', 
                  teacherTest.type,
                  teacherTest.type === 'Specific' ? `${teacherTest.jobDetails?.job} (${teacherTest.jobDetails?.specialization})` : undefined,
                  iq
              );

              // Update Firestore
              const testRef = doc(db, "tests", teacherTestId);
              await updateDoc(testRef, {
                  status: 'completed',
                  completedAt: serverTimestamp(),
                  answers: userAnswers,
                  score: score,
                  iqScore: iq,
                  analysis: analysisResult?.analysis || "Analysis not available.",
                  verdict: analysisResult?.verdict || "N/A",
                  swot: analysisResult?.swot || null,
                  teachingPlan: analysisResult?.teachingPlan || null,
                  suggestions: analysisResult?.suggestions || null
              });

              // Update student document with latest IQ
              if (teacherTest.teacherId && teacherTest.studentEmail) {
                  const studentRef = doc(db, `teachers/${teacherTest.teacherId}/students`, teacherTest.studentEmail);
                  await updateDoc(studentRef, {
                      iq: iq,
                      lastTestDate: serverTimestamp()
                  }).catch(err => console.error("Failed to update student IQ", err));
              }

              setTeacherTest(prev => ({ ...prev, iqScore: iq }));
              setView('teacher-test-submitted');
          } catch (e) {
              console.error(e);
              alert("Failed to submit test. Please try again.");
          } finally {
              setIsSubmitting(false);
          }
          return;
      }

      setResult({
          score,
          total,
          percentage,
          accuracy: questions.length > 0 ? Math.round(((correct + incorrect) > 0 ? correct / (correct + incorrect) : 0) * 100) : 0,
          correct,
          incorrect,
          skipped,
          timeTaken: timeTakenStr
      });

      trackEvent('quiz_completed', { 
          score, 
          percentage, 
          totalQuestions: questions.length,
          timeTaken: timeTakenStr 
      });

      setView('results');
  };

  const handleFetchRecommendations = async (type: 'jobs' | 'studies') => {
      setPathType(type);
      setView('recommendations');
      setLoadingRecs(true);
      setRecommendations([]);
      trackEvent('quiz_recommendations_requested', { type });

      if (!result) return;

      const recs = await generateQuizBasedRecommendations(
          questions,
          userAnswers,
          setupData.classLevel,
          setupData.stream,
          type,
          result.timeTaken
      );

      // Generate images for cards in parallel
      const recsWithImages = await Promise.all(recs.map(async (rec) => {
          const url = await generateImage(rec.imagePrompt);
          return { ...rec, imageUrl: url || undefined };
      }));

      setRecommendations(recsWithImages);
      setLoadingRecs(false);
  };

  const handleViewRoadmap = async (title: string) => {
      setSelectedRecTitle(title);
      setView('roadmap');
      setRoadmapLoading(true);
      setRoadmapData([]);
      trackEvent('quiz_roadmap_viewed', { career: title });

      try {
          const steps = await generateRoadmap(title);
          setRoadmapData(steps);
      } catch (error) {
          console.error("Failed to generate roadmap", error);
      } finally {
          setRoadmapLoading(false);
      }
  };

  const getStatusClass = (idx: number) => {
      if (idx === currentQIndex) return 'ring-2 ring-blue-500 border-transparent transform scale-110';
      const status = visitedStatus[idx];
      switch(status) {
          case 'answered': return 'bg-green-500 text-white border-green-500';
          case 'not-answered': return 'bg-red-500 text-white border-red-500';
          case 'skipped': return 'bg-gray-500 text-white border-gray-500';
          default: return 'bg-white text-gray-600 border-gray-300';
      }
  };

  const getMilestoneIcon = (index: number) => {
      const icons = [
          <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20v2H6.5A2.5 2.5 0 0 1 4 19.5v0Z"/><path d="M4 5A2.5 2.5 0 0 1 6.5 3H20v2H6.5A2.5 2.5 0 0 1 4 5v0Z"/><path d="M12 3v18"/></>,
          <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></>,
          <><path d="M12 16.5V9.5m0 0L10 12m2-2.5 2 2.5"/><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/></>,
          <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></>,
          <><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></>,
          <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.5a6 6 0 0 0-4 6V22h8v-1.5a6 6 0 0 0-4-6Z"/><path d="M15 22v-1.5a4 4 0 0 0-4-4h-1"/><circle cx="12" cy="5" r="2"/></>
      ];
      return icons[index % icons.length];
  };

  // --- TEACHER TEST VIEWS ---
  if (view === 'teacher-test-auth') {
      return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Test Login</h2>
                  <p className="text-gray-600 mb-6">Enter the password provided by your teacher.</p>
                  
                  <div className="bg-blue-50 p-4 rounded-lg mb-6 text-left">
                      <p className="text-sm text-gray-500">Student Name</p>
                      <p className="font-bold text-gray-800">{teacherTest?.studentName}</p>
                      <p className="text-sm text-gray-500 mt-2">Test Type</p>
                      <p className="font-bold text-gray-800">{teacherTest?.type} {teacherTest?.type === 'Specific' ? `(${teacherTest?.jobDetails?.job})` : ''}</p>
                  </div>

                  <form onSubmit={handleTestAuth} className="space-y-4">
                      <div>
                          <input 
                            type="text" 
                            className="w-full border-2 border-gray-300 rounded-lg p-3 text-center text-lg font-mono tracking-widest uppercase focus:border-primary-blue outline-none"
                            placeholder="PASSWORD"
                            value={testPassword}
                            onChange={e => setTestPassword(e.target.value.toUpperCase())}
                          />
                          {authError && <p className="text-red-500 text-sm mt-2">{authError}</p>}
                      </div>
                      <button type="submit" className="w-full bg-primary-blue text-white font-bold py-3 rounded-lg hover:bg-primary-dark transition-all">
                          Start Test
                      </button>
                  </form>
              </div>
          </div>
      );
  }

  if (view === 'teacher-test-submitted') {
      return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-12 text-center">
                  <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                      <i className="fas fa-check"></i>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Test Submitted!</h2>
                  
                  {teacherTest?.iqScore && (
                      <div className="bg-blue-50 p-6 rounded-xl mb-6">
                          <p className="text-sm text-blue-600 font-bold uppercase tracking-wider mb-1">Your Estimated IQ</p>
                          <p className="text-5xl font-extrabold text-blue-700">{teacherTest.iqScore}</p>
                      </div>
                  )}

                  <p className="text-gray-600 mb-8">
                      Your answers have been recorded. Your teacher will review the results and share the full report with you.
                  </p>
                  <button onClick={onExit} className="bg-gray-200 text-gray-700 font-bold py-3 px-8 rounded-lg hover:bg-gray-300 transition-all">
                      Close
                  </button>
              </div>
          </div>
      );
  }

  // --- RENDER HELPERS ---

  if (view === 'setup') {
      if (loading) {
          return (
              <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                  <div className="flex flex-col items-center">
                      <div className="loader !w-16 !h-16 mb-6"></div>
                      <h2 className="text-2xl font-bold text-gray-800">Loading Test Data...</h2>
                  </div>
              </div>
          );
      }

      return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Configure Your Quiz</h2>
                      <button onClick={onExit} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                  </div>
                  <form onSubmit={handleSetupSubmit} className="space-y-6">
                      {user && (
                          <div className="flex items-center gap-4 mb-4 bg-blue-50 p-4 rounded-lg">
                              <img src={displayImage} alt="User" className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover" />
                              <div>
                                  <p className="text-sm text-gray-500">Logged in as</p>
                                  <p className="font-bold text-gray-900">{displayName !== 'Student' ? displayName : (user.email || 'User')}</p>
                              </div>
                          </div>
                      )}
                      
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Class / Grade</label>
                          <select 
                            required 
                            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-blue bg-white"
                            value={setupData.classLevel}
                            onChange={e => setSetupData({...setupData, classLevel: e.target.value, stream: '', subStream: ''})}
                          >
                              <option value="">Select Class</option>
                              <option value="Class 8">Class 8</option>
                              <option value="Class 9">Class 9</option>
                              <option value="Class 10">Class 10</option>
                              <option value="Class 11">Class 11</option>
                              <option value="Class 12">Class 12</option>
                          </select>
                      </div>
                      
                      {['Class 11', 'Class 12'].includes(setupData.classLevel) && (
                          <div className="space-y-4 animate-fade-in-up">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Stream</label>
                                  <select 
                                    required 
                                    className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-blue bg-white"
                                    value={setupData.stream}
                                    onChange={e => setSetupData({...setupData, stream: e.target.value, subStream: ''})}
                                  >
                                      <option value="">Select Stream</option>
                                      <option value="Science">Science</option>
                                      <option value="Commerce">Commerce</option>
                                      <option value="Arts">Arts</option>
                                  </select>
                              </div>
                              {setupData.stream === 'Science' && (
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">Sub-Stream</label>
                                      <select 
                                        required 
                                        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-blue bg-white"
                                        value={setupData.subStream}
                                        onChange={e => setSetupData({...setupData, subStream: e.target.value})}
                                      >
                                          <option value="">Select Option</option>
                                          <option value="PCM">PCM (Maths)</option>
                                          <option value="PCB">PCB (Biology)</option>
                                      </select>
                                  </div>
                              )}
                          </div>
                      )}

                      <button type="submit" className="w-full bg-primary-blue text-white font-bold py-3 rounded-lg hover:bg-primary-dark transition-all">Continue</button>
                  </form>
              </div>
          </div>
      );
  }

  if (view === 'instructions') {
      return (
          <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-8 md:p-12 relative">
                  <button onClick={() => setView('setup')} className="absolute top-6 left-6 text-gray-500 hover:text-gray-800 font-medium flex items-center gap-2"><i className="fas fa-arrow-left"></i> Back</button>
                  
                  <div className="text-center mb-10 mt-6">
                      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">JurniQ Aptitude Test</h1>
                      <p className="text-gray-600 text-lg">Discover your true potential through our assessment calibrated by Personalised AI 'JurniQ AI'.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-12 items-center">
                      <div className="space-y-6 text-gray-700">
                          <h3 className="text-xl font-bold text-gray-900 border-b pb-2">Instructions</h3>
                          <ul className="space-y-4 list-disc pl-5">
                              <li>The quiz consists of <strong>30 questions generated by Personalised AI 'JurniQ AI'</strong> tailored to your profile.</li>
                              <li>You have <strong>30 seconds</strong> to answer each question.</li>
                              <li>There is <strong>no negative marking</strong>, so try to attempt all questions.</li>
                              <li>Results and analysis will be shown immediately after submission.</li>
                          </ul>
                          
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3 mt-6">
                              <i className="fas fa-info-circle text-primary-blue mt-1"></i>
                              <p className="text-sm text-blue-800">Ensure you have a stable internet connection. Do not refresh the page during the test.</p>
                          </div>
                      </div>
                      <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl p-8">
                          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg mb-4">
                              <img src={displayImage} alt="User" className="w-full h-full object-cover" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">Ready, {displayName}?</h3>
                          <p className="text-gray-500 text-sm mb-6">Class: {setupData.classLevel} {setupData.stream}</p>
                          <button onClick={handleStartQuiz} className="bg-primary-blue text-white px-10 py-3 rounded-full font-bold shadow-lg hover:shadow-xl hover:bg-primary-dark transition-all transform hover:-translate-y-1">Start Quiz</button>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  if (view === 'quiz') {
      if (loading) return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col">
              <div className="loader !w-16 !h-16 mb-6"></div>
              <h2 className="text-2xl font-bold text-gray-800">Generating Your Quiz...</h2>
              <p className="text-gray-500 mt-2">Personalised AI 'JurniQ AI' is crafting unique questions for you.</p>
          </div>
      );

      if (isSubmitting) return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col">
              <div className="loader !w-16 !h-16 mb-6"></div>
              <h2 className="text-2xl font-bold text-gray-800">Jurniq AI is analysing your answers and submitting the report...</h2>
              <p className="text-gray-500 mt-2">Please wait while we process your results.</p>
          </div>
      );

      const currentQ = questions[currentQIndex];

      return (
          <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm">
                  <div className="font-bold text-xl text-gray-800">JurniQ Quiz</div>
                  <div className={`flex items-center gap-2 font-mono font-bold text-lg px-4 py-2 rounded-lg ${timeLeft < 10 ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-primary-blue'}`}>
                      <i className="fas fa-clock"></i> 00:{timeLeft.toString().padStart(2, '0')}
                  </div>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
                  {/* Question Area */}
                  <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 md:p-10 flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                          <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Question {currentQIndex + 1} of {questions.length}</span>
                      </div>
                      <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-8 leading-relaxed">
                          {currentQ?.question}
                      </h2>
                      
                      <div className="space-y-4 flex-1">
                          {currentQ?.options ? currentQ.options.map((opt: string, idx: number) => (
                              <button
                                key={idx}
                                onClick={() => handleOptionSelect(idx)}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center group ${userAnswers[currentQIndex] === idx ? 'border-primary-blue bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
                              >
                                  <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${userAnswers[currentQIndex] === idx ? 'border-primary-blue bg-primary-blue' : 'border-gray-400 group-hover:border-primary-blue'}`}>
                                      {userAnswers[currentQIndex] === idx && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                  </div>
                                  <span className={`text-base md:text-lg ${userAnswers[currentQIndex] === idx ? 'text-primary-blue font-semibold' : 'text-gray-700'}`}>{opt}</span>
                              </button>
                          )) : (
                              <textarea 
                                  className="w-full h-32 p-4 border-2 border-gray-200 rounded-xl focus:border-primary-blue outline-none resize-none"
                                  placeholder="Type your answer here..."
                                  value={userAnswers[currentQIndex] as string || ''}
                                  onChange={(e) => {
                                      const newAnswers = [...userAnswers];
                                      newAnswers[currentQIndex] = e.target.value;
                                      setUserAnswers(newAnswers);
                                      
                                      const newStatus = [...visitedStatus];
                                      newStatus[currentQIndex] = e.target.value ? 'answered' : 'not-answered';
                                      setVisitedStatus(newStatus);
                                  }}
                              />
                          )}
                      </div>

                      <div className="mt-8 pt-6 border-t flex justify-between items-center">
                          <button onClick={handleClearResponse} className="text-gray-500 hover:text-gray-800 font-medium px-4">Clear Selection</button>
                          <button 
                            onClick={() => moveToNext(false)}
                            className="bg-primary-blue text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-dark transition-all shadow-md"
                          >
                              {currentQIndex === questions.length - 1 ? 'Submit Quiz' : 'Save & Next'}
                          </button>
                      </div>
                  </div>

                  {/* Sidebar Palette */}
                  <div className="bg-white rounded-2xl shadow-lg p-6 h-fit">
                      <h3 className="font-bold text-gray-800 mb-4">Question Palette</h3>
                      <div className="grid grid-cols-5 gap-3 mb-6">
                          {questions.map((_, idx) => (
                              <button 
                                key={idx}
                                onClick={() => { setCurrentQIndex(idx); resetTimer(); }}
                                className={`w-10 h-10 rounded-lg text-sm font-bold border transition-all ${getStatusClass(idx)}`}
                              >
                                  {idx + 1}
                              </button>
                          ))}
                      </div>
                      
                      <div className="space-y-3 text-xs text-gray-600 border-t pt-4">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-sm"></div> Answered</div>
                          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> Not Answered</div>
                          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border border-gray-300 rounded-sm"></div> Not Visited</div>
                          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-500 rounded-sm"></div> Skipped</div>
                      </div>

                      <button onClick={handleSubmitQuiz} className="w-full mt-8 bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition-colors shadow-md">
                          Submit Test
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- RESULTS VIEW ---
  if (view === 'results' && result) {
      const passed = result.percentage >= 30;

      return (
          <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex items-center justify-center">
              <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row">
                  {/* Summary Side */}
                  <div className="bg-primary-blue text-white p-8 md:p-12 md:w-2/5 flex flex-col justify-center items-center text-center">
                      <h2 className="text-3xl font-bold mb-2">Your Result</h2>
                      <div className="w-40 h-40 rounded-full bg-white/20 flex flex-col items-center justify-center my-8 backdrop-blur-sm border-4 border-white/30">
                          <span className="text-5xl font-extrabold">{result.score}</span>
                          <span className="text-sm opacity-80">of {result.total}</span>
                      </div>
                      <h3 className="text-xl font-semibold mb-1">
                          {passed ? "Excellent!" : "Keep Practicing"}
                      </h3>
                      <p className="text-white/80 text-sm">
                          {passed ? "You have a strong aptitude." : "Your score was below 30%."}
                      </p>
                  </div>

                  {/* Stats Side */}
                  <div className="p-8 md:p-12 md:w-3/5">
                      <h3 className="text-2xl font-bold text-gray-900 mb-8">Summary</h3>
                      <div className="space-y-6">
                          <div className="space-y-2">
                              <div className="flex justify-between text-sm font-semibold text-gray-600">
                                  <span>Accuracy</span>
                                  <span>{result.accuracy}%</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                  <div className="bg-primary-blue h-full rounded-full transition-all duration-1000" style={{width: `${result.accuracy}%`}}></div>
                              </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-center mt-8">
                              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                  <div className="text-2xl font-bold text-green-600">{result.correct}</div>
                                  <div className="text-xs text-green-800 font-medium uppercase mt-1">Correct</div>
                              </div>
                              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                  <div className="text-2xl font-bold text-red-600">{result.incorrect}</div>
                                  <div className="text-xs text-red-800 font-medium uppercase mt-1">Incorrect</div>
                              </div>
                              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                  <div className="text-2xl font-bold text-gray-600">{result.skipped}</div>
                                  <div className="text-xs text-gray-500 font-medium uppercase mt-1">Skipped</div>
                              </div>
                          </div>
                      </div>

                      <div className="mt-10 flex gap-4">
                          <button onClick={() => setView('setup')} className="flex-1 border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors">
                              Retake Quiz
                          </button>
                          {passed ? (
                              <button onClick={() => setView('path-selection')} className="flex-1 bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition-colors shadow-lg">
                                  Explore Careers
                              </button>
                          ) : (
                              <button onClick={() => setView('low-score')} className="flex-1 bg-primary-blue text-white font-bold py-3 rounded-xl hover:bg-primary-dark transition-colors shadow-lg">
                                  View Details
                              </button>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  if (view === 'low-score') {
      return (
          <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
              <div className="max-w-2xl w-full bg-white p-12 rounded-3xl shadow-lg text-center">
                  <div className="mx-auto w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
                      <i className="fas fa-exclamation-triangle text-3xl"></i>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">Keep Trying!</h1>
                  <p className="text-lg text-gray-700 mb-2">
                      Your score was below 30%. We are not able to recommend a job at this time.
                  </p>
                  <p className="text-gray-500 mb-10">Please retake the quiz to help us find the best path for you.</p>
                  <button onClick={() => setView('setup')} className="bg-blue-600 text-white font-bold py-3 px-10 rounded-lg shadow-md hover:bg-blue-700 transition-all">
                      Retake Quiz
                  </button>
              </div>
          </div>
      );
  }

  if (view === 'path-selection') {
      return (
          <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center justify-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Choose Your Path</h1>
              <p className="text-gray-600 mb-12 text-lg text-center">Based on your results, we recommend exploring these categories.</p>
              
              <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-3xl shadow-xl overflow-hidden hover:-translate-y-2 transition-transform duration-300">
                      <div className="h-56 bg-blue-600 relative">
                          <img src="https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Fworking-women.jpg?alt=media&token=ea4e5f64-ca4d-454c-8d14-e0756a84aad1" className="w-full h-full object-cover opacity-80" alt="Jobs" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      </div>
                      <div className="p-8 text-center">
                          <h3 className="text-2xl font-bold mb-3 text-gray-800">Jobs & Careers</h3>
                          <p className="text-gray-600 mb-8">Discover job opportunities that match your profile.</p>
                          <button onClick={() => handleFetchRecommendations('jobs')} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition w-full">Explore Paths</button>
                      </div>
                  </div>
                  
                  <div className="bg-white rounded-3xl shadow-xl overflow-hidden hover:-translate-y-2 transition-transform duration-300">
                      <div className="h-56 bg-green-500 relative">
                          <img src="https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Fgraduation_background_squre.jpg?alt=media&token=95c7ef17-4f2e-48c3-806c-49d62974026b" className="w-full h-full object-cover opacity-80" alt="Studies" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      </div>
                      <div className="p-8 text-center">
                          <h3 className="text-2xl font-bold mb-3 text-gray-800">Higher Studies</h3>
                          <p className="text-gray-600 mb-8">Find educational pathways for your future.</p>
                          <button onClick={() => handleFetchRecommendations('studies')} className="bg-green-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-600 transition w-full">Explore Paths</button>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  if (view === 'recommendations') {
      return (
          <div className="min-h-screen bg-gray-50 p-4 md:p-12">
              <div className="max-w-6xl mx-auto">
                  <div className="flex justify-between items-center mb-8">
                      <button onClick={() => setView('path-selection')} className="text-gray-500 hover:text-gray-800 font-bold flex items-center gap-2"><i className="fas fa-arrow-left"></i> Back</button>
                      <h1 className="text-3xl font-bold text-gray-900">Recommended {pathType === 'jobs' ? 'Jobs' : 'Study Paths'}</h1>
                      <div className="w-20"></div> {/* Spacer */}
                  </div>

                  {loadingRecs ? (
                      <div className="text-center py-20">
                          <div className="loader !w-16 !h-16 mx-auto mb-6"></div>
                          <p className="text-xl text-gray-600">Personalised AI 'JurniQ AI' is analyzing your quiz performance...</p>
                          <p className="text-sm text-gray-400 mt-2">Checking answering patterns, time taken, and accuracy.</p>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {recommendations.map((rec, idx) => (
                              <div key={idx} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all h-full flex flex-col group">
                                  <div className="h-56 relative bg-gray-200 overflow-hidden">
                                      {rec.imageUrl ? (
                                          <img src={rec.imageUrl} alt={rec.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                      ) : (
                                          <div className="w-full h-full flex items-center justify-center text-gray-400"><i className="fas fa-image text-4xl"></i></div>
                                      )}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                      <h3 className="absolute bottom-4 left-6 text-white text-2xl font-bold">{rec.title}</h3>
                                  </div>
                                  <div className="p-6 flex flex-col flex-1">
                                      <p className="text-gray-600 leading-relaxed mb-6 flex-1">{rec.description}</p>
                                      <button 
                                        onClick={() => handleViewRoadmap(rec.title)}
                                        className="w-full py-3 border-2 border-primary-blue text-primary-blue font-bold rounded-xl hover:bg-primary-blue hover:text-white transition-colors"
                                      >
                                          View Roadmap
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // --- ROADMAP VIEW ---
  if (view === 'roadmap') {
      return (
          <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex justify-center">
              <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-8 relative overflow-hidden">
                  <button onClick={() => setView('recommendations')} className="absolute top-6 left-6 text-gray-500 hover:text-gray-800 font-bold flex items-center gap-2 transition-colors z-10 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200">
                      <i className="fas fa-arrow-left"></i> Back to Recommendations
                  </button>

                  <div className="text-center mt-12 mb-10">
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">Roadmap for <span className="text-primary-blue">{selectedRecTitle}</span></h2>
                      <p className="text-gray-500">A step-by-step guide to achieving your goal.</p>
                  </div>

                  {roadmapLoading ? (
                      <div className="flex flex-col items-center justify-center py-20">
                          <div className="loader !w-12 !h-12 border-4 border-gray-200 border-t-primary-blue rounded-full animate-spin mb-4"></div>
                          <p className="text-gray-600 font-medium">Generating your personalized roadmap...</p>
                      </div>
                  ) : (
                      <div className="relative pl-8 md:pl-16 pr-4 space-y-0">
                          {roadmapData.map((step, idx) => {
                              const isLast = idx === roadmapData.length - 1;
                              return (
                                  <div key={idx} className="flex items-start animate-fade-in-up" style={{ animationDelay: `${idx * 150}ms` }}>
                                      <div className="flex flex-col items-center mr-6 md:mr-10">
                                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 text-white flex items-center justify-center shrink-0 z-10 shadow-lg border-4 border-white">
                                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                  {getMilestoneIcon(idx)}
                                              </svg>
                                          </div>
                                          {!isLast && <div className="w-1 flex-grow bg-indigo-100 min-h-[5rem]"></div>}
                                      </div>
                                      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 w-full mb-8 relative shadow-sm hover:shadow-md transition-all hover:-translate-y-1 -top-2">
                                          <div className="absolute -left-3 top-5 w-6 h-6 bg-gray-50 transform rotate-45 border-l border-b border-gray-200"></div>
                                          <div className="flex justify-between items-start mb-2">
                                              <h4 className="font-bold text-gray-900 text-lg">{step.title}</h4>
                                              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ml-4">{step.duration}</span>
                                          </div>
                                          <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
          </div>
      );
  }

  return null;
};

export default Quiz;
