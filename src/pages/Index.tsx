
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Users, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Team {
  id: string;
  name: string;
  created_at: string;
}

const Index = () => {
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserTeam = async () => {
      try {
        // First check if user is a team captain
        const { data: captainTeam } = await supabase
          .from('teams')
          .select('*')
          .eq('captain_id', (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle();

        if (captainTeam) {
          setUserTeam(captainTeam);
          setLoading(false);
          return;
        }

        // If not a captain, check if user is a team member
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('team:teams(*)')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle();

        if (teamMember) {
          setUserTeam(teamMember.team as Team);
        }
      } catch (error) {
        console.error('Error fetching team:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserTeam();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-8 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Welcome to QuizVerse of SCSIT
          </h1>
          
          {userTeam ? (
            <div className="space-y-6">
              <div className="p-6 bg-primary/5 rounded-lg">
                <h2 className="text-xl font-semibold mb-2">Your Team</h2>
                <p className="text-lg text-primary">{userTeam.name}</p>
              </div>
              <Button asChild size="lg" className="animate-pulse hover:animate-none" variant="default">
                <Link to="/quiz" className="inline-flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Start Quiz
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-xl text-gray-600">
                Join the ultimate quiz competition platform where knowledge meets excitement.
              </p>
              <div className="flex items-center justify-center gap-4">
                {!loading && (
                  <Button asChild size="lg" className="animate-slideIn" style={{ animationDelay: "0.2s" }}>
                    <Link to="/teams">Register Team</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 mt-16">
          <Card className="p-6 animate-slideIn" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Team Competition</h3>
                <p className="text-gray-600">
                  Form your team and compete against others in exciting quiz rounds.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 animate-slideIn" style={{ animationDelay: "0.6s" }}>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Win Prizes</h3>
                <p className="text-gray-600">
                  Showcase your knowledge and win amazing prizes in our competitions.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
