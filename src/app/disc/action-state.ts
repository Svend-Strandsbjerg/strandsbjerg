import type { DiscQuestion } from "@/lib/disc-types";

export type DiscFlowState = {
  status: "idle" | "success" | "error";
  message: string;
  sessionId: string;
  questions: DiscQuestion[];
};

export const initialDiscFlowState: DiscFlowState = {
  status: "idle",
  message: "",
  sessionId: "",
  questions: [],
};
