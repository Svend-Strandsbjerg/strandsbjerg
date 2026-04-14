export type DiscResponseInput = {
  sessionId: string;
  questionId: string;
  selectedOptionIds: string[];
};

export type DiscQuestionOption = {
  id: string;
  label: string;
};

export type DiscQuestion = {
  id: string;
  prompt: string;
  options: DiscQuestionOption[];
};
