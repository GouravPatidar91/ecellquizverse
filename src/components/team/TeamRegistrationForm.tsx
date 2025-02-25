
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TeamMemberInput } from "./TeamMemberInput";
import { Card } from "@/components/ui/card";
import { TeamFormData } from "@/types/team";

interface TeamRegistrationFormProps {
  formData: TeamFormData;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onTeamNameChange: (value: string) => void;
  onCaptainNameChange: (value: string) => void;
  onMemberChange: (index: number, value: string) => void;
}

export const TeamRegistrationForm = ({
  formData,
  isLoading,
  onSubmit,
  onTeamNameChange,
  onCaptainNameChange,
  onMemberChange,
}: TeamRegistrationFormProps) => {
  const { teamName, captainName, members } = formData;

  return (
    <Card className="p-6 animate-slideIn">
      <h2 className="text-2xl font-semibold mb-6">Team Registration</h2>
      
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="teamName">Team Name</Label>
          <Input
            id="teamName"
            value={teamName}
            onChange={(e) => onTeamNameChange(e.target.value)}
            placeholder="Enter your team name"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="captainName">Captain Name</Label>
          <Input
            id="captainName"
            value={captainName}
            onChange={(e) => onCaptainNameChange(e.target.value)}
            placeholder="Enter captain's name"
            disabled={isLoading}
          />
        </div>

        {members.map((member, index) => (
          <TeamMemberInput
            key={index}
            index={index}
            value={member}
            onChange={onMemberChange}
            disabled={isLoading}
          />
        ))}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Registering..." : "Register Team"}
        </Button>
      </form>
    </Card>
  );
};
