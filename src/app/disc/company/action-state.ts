export type CompanyInviteActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialCompanyInviteActionState: CompanyInviteActionState = {
  status: "idle",
  message: "",
};
