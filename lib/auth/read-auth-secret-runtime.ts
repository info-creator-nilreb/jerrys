import "server-only";

const authSecretKey = ["AUTH", "SECRET"].join("_");
const nextAuthSecretKey = ["NEXTAUTH", "SECRET"].join("_");

export function readAuthSecretRuntime(): string | undefined {
  const env = process.env;
  return (
    env[authSecretKey]?.trim() ||
    env[nextAuthSecretKey]?.trim() ||
    Reflect.get(env, authSecretKey)?.trim() ||
    Reflect.get(env, nextAuthSecretKey)?.trim() ||
    undefined
  );
}

export function listAuthRelatedEnvKeys(): string[] {
  return Object.keys(process.env).filter(
    (k) => k.includes("AUTH") || k.includes("SECRET"),
  );
}
