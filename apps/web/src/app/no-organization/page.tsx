import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NoOrganizationPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4 text-center px-4">
      <h1 className="text-3xl font-bold">No Organization Assigned</h1>
      <p className="text-muted-foreground max-w-md">
        Every user must be assigned to an organization to access the platform. 
        Please contact your administrator or check your email for an invitation.
      </p>
      <Button asChild>
          <Link href="/login">Back to Login</Link>
      </Button>
    </div>
  );
}
