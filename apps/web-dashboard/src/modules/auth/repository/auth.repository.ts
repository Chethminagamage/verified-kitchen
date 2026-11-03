import { createClient } from "@/infrastructure/supabase/server";

import type {
  LoginCredentials,
} from "../model/auth.model";

export class AuthRepository {
  async signIn(
    credentials: LoginCredentials
  ) {
    const supabase = await createClient();

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

    if (error) {
      throw new Error(error.message);
    }

    return data.user;
  }

  async signOut() {
    const supabase = await createClient();

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }
}