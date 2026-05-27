export function getRequiredServerEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required on the server.`);
  }

  return value;
}

export function getOptionalServerEnv(name: string): string | undefined {
  return process.env[name];
}
