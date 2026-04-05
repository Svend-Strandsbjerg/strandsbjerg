export type SignupActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialSignupActionState: SignupActionState = {
  status: "idle",
  message: "",
};
