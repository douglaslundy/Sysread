import {
  hash,
  verify,
  type Options,
} from "@node-rs/argon2";
import type { PasswordHasher } from "../application/types";

const options: Options = {
  algorithm: 2,
  memoryCost: 19_456,
  outputLen: 32,
  parallelism: 1,
  timeCost: 2,
};

export const argon2PasswordHasher: PasswordHasher = {
  hash(password) {
    return hash(password, options);
  },
  verify(passwordHash, password) {
    return verify(passwordHash, password, options);
  },
};