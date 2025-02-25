
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TeamMemberInputProps {
  index: number;
  value: string;
  onChange: (index: number, value: string) => void;
  disabled?: boolean;
}

export const TeamMemberInput = ({ index, value, onChange, disabled }: TeamMemberInputProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={`member${index}`}>Team Member {index + 1}</Label>
      <Input
        id={`member${index}`}
        value={value}
        onChange={(e) => onChange(index, e.target.value)}
        placeholder={`Enter member ${index + 1} name`}
        disabled={disabled}
      />
    </div>
  );
};
