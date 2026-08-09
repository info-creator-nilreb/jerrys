import type { DefaultSession } from "next-auth";
import type { AuthSubjectKind } from "@/features/customers";

declare module "next-auth" {
  interface User {
    subjectKind?: AuthSubjectKind;
  }

  interface Session {
    user: {
      id: string;
      subjectKind?: AuthSubjectKind;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    subjectKind?: AuthSubjectKind;
  }
}
