import type { DefaultSession } from "next-auth";
import type { AuthSubjectKind } from "@/features/customers";

declare module "next-auth" {
  interface User {
    subjectKind?: AuthSubjectKind;
    mfaPending?: boolean;
  }

  interface Session {
    user: {
      id: string;
      subjectKind?: AuthSubjectKind;
      mfaPending?: boolean;
      mfaVerifiedAt?: number;
      credentialsIssuedAt?: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    subjectKind?: AuthSubjectKind;
    mfaPending?: boolean;
    mfaVerifiedAt?: number;
    credentialsIssuedAt?: number;
  }
}
