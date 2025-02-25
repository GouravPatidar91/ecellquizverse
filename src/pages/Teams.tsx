
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TeamRegistrationForm } from "@/components/team/TeamRegistrationForm";
import { TeamFormData } from "@/types/team";

const Teams = () => {
  const [formData, setFormData] = useState<TeamFormData>({
    teamName: "",
    captainName: "",
    members: ["", "", ""]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasTeam, setHasTeam] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to create a team",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }
      setUserId(user.id);

      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('captain_id', user.id)
        .maybeSingle();

      if (teamError) {
        console.error('Error checking team:', teamError);
        return;
      }

      if (team) {
        setHasTeam(true);
        toast({
          title: "Team Already Exists",
          description: "You have already created a team",
        });
      }
    };

    checkAuth();
  }, [navigate, toast]);

  const handleMemberChange = (index: number, value: string) => {
    const newMembers = [...formData.members];
    newMembers[index] = value;
    setFormData(prev => ({ ...prev, members: newMembers }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { teamName, captainName, members } = formData;

    if (!teamName || !captainName || members.some(member => !member)) {
      toast({
        title: "Error",
        description: "Please fill in all fields including team name, captain name, and member names",
        variant: "destructive",
      });
      return;
    }

    if (!userId) {
      toast({
        title: "Error",
        description: "You must be logged in to create a team",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Insert team first
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          captain_id: userId,
        })
        .select()
        .single();

      if (teamError) {
        if (teamError.code === '23505') {
          throw new Error("You can only create one team");
        }
        throw teamError;
      }

      // Insert captain as a team member
      const { error: captainError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          member_name: captainName,
          user_id: userId,
          is_captain: true
        });

      if (captainError) throw captainError;

      // Insert other team members
      const { error: membersError } = await supabase
        .from('team_members')
        .insert(
          members.map(memberName => ({
            team_id: team.id,
            member_name: memberName,
            user_id: userId,
            is_captain: false
          }))
        );

      if (membersError) throw membersError;

      setHasTeam(true);
      toast({
        title: "Success!",
        description: "Team registration completed successfully",
      });

      navigate('/');
      
    } catch (error: any) {
      console.error('Error registering team:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create team",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!userId || hasTeam) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-xl mx-auto">
          <TeamRegistrationForm
            formData={formData}
            isLoading={isLoading}
            onSubmit={handleSubmit}
            onTeamNameChange={(value) => setFormData(prev => ({ ...prev, teamName: value }))}
            onCaptainNameChange={(value) => setFormData(prev => ({ ...prev, captainName: value }))}
            onMemberChange={handleMemberChange}
          />
        </div>
      </div>
    </div>
  );
};

export default Teams;
