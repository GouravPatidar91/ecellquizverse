
import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { PostgrestError } from "@supabase/supabase-js";
import { Textarea } from "@/components/ui/textarea";

type QuestionType = 'multiple_choice' | 'written';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  question_type: QuestionType;
  time_limit: number;
  correct_answer: string;
}

interface QuizResult {
  id: string;
  user_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
}

const Quiz = () => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allResults, setAllResults] = useState<QuizResult[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.rpc('is_admin', { user_id: user.id });
      if (!error && data) {
        setIsAdmin(true);
        const { data: results, error: resultsError } = await supabase
          .from('quiz_results')
          .select('*')
          .order('completed_at', { ascending: false });

        if (!resultsError && results) {
          setAllResults(results);
        }
      }
    };

    checkUserRole();
  }, [navigate]);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*');

      if (error) throw error;

      if (data) {
        const transformedQuestions: QuizQuestion[] = data.map(q => ({
          ...q,
          options: q.options as string[],
          question_type: (q.question_type || 'multiple_choice') as QuestionType,
          time_limit: q.time_limit || 30,
          correct_answer: q.correct_answer
        }));
        setQuestions(transformedQuestions);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to load quiz questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (!quizStarted || timeRemaining === null) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          handleNextQuestion();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, timeRemaining]);

  // Add these new state variables after other state declarations
  const [visibilityWarnings, setVisibilityWarnings] = useState(0);
  const [isHidden, setIsHidden] = useState(false);

  // Add this effect to handle tab visibility
  useEffect(() => {
    if (!quizStarted || quizCompleted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsHidden(true);
        setVisibilityWarnings(prev => prev + 1);
        
        if (visibilityWarnings === 0) {
          toast({
            title: "Warning!",
            description: "Do not leave the quiz tab! This is your first warning.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Quiz Terminated",
            description: "You switched tabs again. Your quiz has been automatically submitted.",
            variant: "destructive",
          });
          handleSubmitQuiz();
        }
      } else {
        setIsHidden(false);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
  }, [quizStarted, quizCompleted, visibilityWarnings, toast]);

  const handleStartQuiz = () => {
    if (questions.length === 0) {
      toast({
        title: "No Questions",
        description: "There are no quiz questions available yet.",
        variant: "destructive",
      });
      return;
    }
    setVisibilityWarnings(0);
    setIsHidden(false);
    setQuizStarted(true);
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setAnswers([]);
    setTimeRemaining(questions[0].time_limit);
  };

  const handleNextQuestion = useCallback(() => {
    if (!selectedAnswer) {
      toast({
        title: "Select an Answer",
        description: "Please select an answer before proceeding",
        variant: "destructive",
      });
      return;
    }

    const currentQ = questions[currentQuestion];
    if (currentQ.question_type === 'multiple_choice') {
      if (selectedAnswer === currentQ.correct_answer) {
        setScore(prev => prev + 1);
      }
    } else {
      if (selectedAnswer.toLowerCase() === currentQ.correct_answer.toLowerCase()) {
        setScore(prev => prev + 1);
      }
    }

    setAnswers(prev => [...prev, selectedAnswer]);

    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setTimeRemaining(questions[currentQuestion + 1].time_limit);
    } else {
      setQuizCompleted(true);
    }
  }, [currentQuestion, questions, selectedAnswer, toast]);

  const handleSubmitQuiz = async () => {
    try {
      setSubmitting(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error("You must be logged in to submit the quiz");
      }

      const { error: insertError } = await supabase
        .from('quiz_results')
        .insert([{
          user_id: user.id,
          score: score,
          total_questions: questions.length
        }]);

      if (insertError) throw insertError;

      if (isAdmin) {
        const { data: results, error: resultsError } = await supabase
          .from('quiz_results')
          .select('*')
          .order('completed_at', { ascending: false });

        if (!resultsError && results) {
          setAllResults(results);
        }
      }

      toast({
        title: "Quiz Submitted",
        description: "Your responses have been recorded successfully",
      });

      setQuizStarted(false);
      setQuizCompleted(false);
      setScore(0);
      setAnswers([]);
      
      navigate('/');
    } catch (error) {
      const e = error as Error | PostgrestError;
      console.error('Error submitting quiz:', e);
      toast({
        title: "Error",
        description: e.message || "Failed to submit quiz results",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
        <p className="text-lg">Loading questions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {isAdmin && !quizStarted && (
            <Card className="p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-4">Quiz Results (Admin View)</h2>
              <div className="space-y-4">
                {allResults.map((result) => (
                  <div key={result.id} className="p-4 border rounded-lg bg-white">
                    <p className="font-medium">Score: {result.score}/{result.total_questions}</p>
                    <p className="text-sm text-gray-600">
                      Completed: {new Date(result.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
          
          <Card className="p-6">
            {!quizStarted ? (
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-semibold">Welcome to the Quiz!</h2>
                <p className="text-gray-600">Test your knowledge with our quiz questions.</p>
                <Button onClick={handleStartQuiz} className="w-full">
                  Start Quiz
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {!quizCompleted ? (
                  <>
                    {isHidden && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4 animate-pulse">
                        <p className="text-red-600 font-medium">
                          Warning: Please return to the quiz tab! ({visibilityWarnings}/1)
                        </p>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">
                        Question {currentQuestion + 1} of {questions.length}
                      </h3>
                      {timeRemaining !== null && (
                        <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                          timeRemaining <= 10 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-primary/10'
                        }`}>
                          Time: {timeRemaining}s
                        </span>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-lg whitespace-pre-wrap">{questions[currentQuestion].question}</p>
                      </div>
                      
                      <div className="space-y-2">
                        {questions[currentQuestion].question_type === 'multiple_choice' ? (
                          questions[currentQuestion].options.map((option, index) => (
                            <Button
                              key={index}
                              variant={selectedAnswer === index.toString() ? "default" : "outline"}
                              className="w-full justify-start text-left min-h-[44px] whitespace-pre-wrap"
                              onClick={() => setSelectedAnswer(index.toString())}
                            >
                              <span className="inline-block">{option}</span>
                            </Button>
                          ))
                        ) : (
                          <Textarea
                            value={selectedAnswer || ''}
                            onChange={(e) => setSelectedAnswer(e.target.value)}
                            placeholder="Type your answer here..."
                            className="min-h-[200px] resize-y text-base p-4"
                          />
                        )}
                      </div>
                    </div>

                    <Button 
                      onClick={handleNextQuestion}
                      className="w-full"
                    >
                      {currentQuestion + 1 === questions.length ? "Finish Quiz" : "Next Question"}
                    </Button>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <h3 className="text-xl font-medium">Quiz Completed!</h3>
                    <p className="text-gray-600">
                      You've answered all the questions. Click submit to record your responses.
                    </p>
                    <Button 
                      onClick={handleSubmitQuiz}
                      className="w-full"
                      disabled={submitting}
                    >
                      {submitting ? "Submitting..." : "Submit Quiz"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
