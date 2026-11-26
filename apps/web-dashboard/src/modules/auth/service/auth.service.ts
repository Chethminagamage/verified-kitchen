import { AuthRepository } from "../repository/auth.repository";

import {
  InvalidCredentialsError,
  type LoginCredentials,
} from "../model/auth.model";

export class AuthService {
  constructor(
    private readonly authRepository =
      new AuthRepository()
  ) {}

  async login(
    credentials: LoginCredentials
  ) {
    const email =
      credentials.email.trim().toLowerCase();

    if (!email || !credentials.password) {
      throw new InvalidCredentialsError();
    }

    return this.authRepository.signIn({
      email,
      password: credentials.password,
    });
  }

  async logout() {
    return this.authRepository.signOut();
  }
}