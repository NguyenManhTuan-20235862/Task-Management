import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1]?.[0] ?? "";
  const first = parts.length > 1 ? (parts[0]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function UserAvatar({
  name,
  size = "default",
}: {
  name: string;
  size?: "sm" | "default" | "lg";
}) {
  return (
    <Avatar size={size}>
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
