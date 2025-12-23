import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "user" | "admin";
      isPremium: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}


