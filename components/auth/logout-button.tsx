"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await logout();
          router.push("/login");
          router.refresh();
        })
      }
    >
      <LogOut data-icon="inline-start" aria-hidden />
      {isPending ? "Đang đăng xuất..." : "Đăng xuất"}
    </Button>
  );
}
