import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CodeCompiler from "@/components/CodeCompiler";
import type { QuestionType } from "@/types/quiz";

type DatabaseQuizQuestion = Database["public"]["Tables"]["quiz_questions"]["Row"];

interface QuizQuestion extends Omit<DatabaseQuizQuestion, 'options'> {
  options: string[];
  question_type: QuestionType;
  has_compiler: boolean | null;
  compiler_language: string | null;
}

interface QuestionFormState {
  question: string;
  options: string[];
  correctAnswer: number;
  questionType: QuestionType;
  writtenAnswer: string;
  timeLimit: number;
  hasCompiler: boolean;
  compilerLanguage: string;
}

const initialFormState: QuestionFormState = {
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  questionType: "multiple_choice",
  writtenAnswer: "",
  timeLimit: 30,
  hasCompiler: false,
  compilerLanguage: "javascript"
};

const Admin = () => {
  const [formState, setFormState] = useState<QuestionFormState>(initialFormState);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingQuestions, setExistingQuestions] = useState<QuizQuestion[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  const resetForm = () => setFormState(initialFormState);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setExistingQuestions(data.map(q => ({
          ...q,
          options: q.options as string[],
          question_type: (q.question_type || 'multiple_choice') as QuestionType,
          time_limit: q.time_limit || 30,
          has_compiler: q.has_compiler as boolean || false,
          compiler_language: q.compiler_language as string || 'javascript'
        })));
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch existing questions",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) {
          navigate('/auth');
          return;
        }

        const { data: adminCheck } = await supabase
          .rpc('is_admin', { user_id: user.id });

        if (!adminCheck) {
          toast({
            title: "Access Denied",
            description: "You need admin privileges to access this page",
            variant: "destructive",
          });
          navigate('/');
          return;
        }

        setIsAdmin(true);
        fetchQuestions();
      } catch (error) {
        console.error('Error checking admin status:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { question, questionType, options, correctAnswer, writtenAnswer, timeLimit, hasCompiler, compilerLanguage } = formState;

    if (!question) {
      toast({ title: "Error", description: "Please fill in the question", variant: "destructive" });
      return;
    }

    if (questionType === 'multiple_choice' && options.some(option => !option)) {
      toast({ title: "Error", description: "Please fill in all options", variant: "destructive" });
      return;
    }

    if (questionType === 'written' && !writtenAnswer) {
      toast({ title: "Error", description: "Please provide the correct answer", variant: "destructive" });
      return;
    }

    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase
        .from('quiz_questions')
        .insert({
          question,
          options: questionType === 'multiple_choice' ? options : [],
          correct_answer: questionType === 'multiple_choice' ? correctAnswer.toString() : writtenAnswer,
          question_type: questionType,
          created_by: user?.id ?? '',
          time_limit: timeLimit,
          has_compiler: hasCompiler,
          compiler_language: hasCompiler ? compilerLanguage : null
        });

      if (error) throw error;

      toast({ title: "Success!", description: "Question added successfully" });
      resetForm();
      fetchQuestions();
    } catch (error) {
      console.error('Error adding question:', error);
      toast({
        title: "Error",
        description: "Failed to add question. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      toast({ title: "Success", description: "Question deleted successfully" });
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center"><p className="text-lg">Loading...</p></div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <QuestionForm formState={formState} setFormState={setFormState} onSubmit={handleSubmit} />
          <ExistingQuestions questions={existingQuestions} onDelete={handleDelete} />
        </div>
      </div>
    </div>
  );
};

const QuestionForm = ({ formState, setFormState, onSubmit }: {
  formState: QuestionFormState;
  setFormState: React.Dispatch<React.SetStateAction<QuestionFormState>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}) => {
  // Form rendering logic here
  return (
    <Card className="p-6 animate-slideIn">
      <h2 className="text-2xl font-semibold mb-6">Add Quiz Question</h2>
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Form fields here */}
      </form>
    </Card>
  );
};

const ExistingQuestions = ({ questions, onDelete }: {
  questions: QuizQuestion[];
  onDelete: (id: string) => Promise<void>;
}) => {
  // Questions list rendering logic here
  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Existing Questions</h2>
      {/* Questions list here */}
    </Card>
  );
};

export default Admin;
