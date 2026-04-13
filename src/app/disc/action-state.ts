export type DiscFlowState = {
  status: "idle" | "success" | "error";
  message: string;
  sessionId: string;
};

export const initialDiscFlowState: DiscFlowState = {
  status: "idle",
  message: "",
  sessionId: "",
};
