export type LoginMethod = "CREDENTIALS" | "GOOGLE" | "MAGIC_LINK" | "OAUTH";

export function formatAuthMethodLabel(method: LoginMethod) {
  switch (method) {
    case "CREDENTIALS":
      return "Credentials";
    case "GOOGLE":
      return "Google";
    case "MAGIC_LINK":
      return "Magic link";
    default:
      return "OAuth";
  }
}
