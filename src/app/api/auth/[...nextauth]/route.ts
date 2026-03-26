import NextAuth, { type NextAuthOptions } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import { createAdminClient } from '@/lib/supabase';
import { githubIdToUUID } from '@/lib/utils';

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      // Request read:user, repo:status scopes for reading commit data
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
    }),
  ],
  callbacks: {
    // Store the GitHub access token in the JWT
    async jwt({ token, account, profile }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      if (profile) {
        token.githubUsername = (profile as any).login;
        token.avatarUrl = (profile as any).avatar_url;
      }
      return token;
    },
    // Expose token data to the session object (client-accessible)
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      if (session.user && token.sub) {
        session.user.id = githubIdToUUID(token.sub);
        session.user.githubUsername = token.githubUsername;
        session.user.image = (token.avatarUrl as string) ?? session.user.image;
      }
      return session;
    },
    // After sign-in, upsert user profile in Supabase
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'github' || !profile) return true;

      const githubProfile = profile as any;
      const admin = createAdminClient();

      const { error } = await admin.from('user_profiles').upsert(
        {
          id: githubIdToUUID(user.id),
          github_username: githubProfile.login,
          nickname: githubProfile.name ?? githubProfile.login,
          avatar_url: githubProfile.avatar_url,
          // level and xp default to 1 and 0 from DB; upsert won't overwrite existing values
        },
        {
          onConflict: 'id',
          ignoreDuplicates: false,
        }
      );

      if (error) {
        console.error('[NextAuth signIn] Failed to upsert user profile:', error);
        // Don't block sign-in on DB failure
      }

      return true;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
