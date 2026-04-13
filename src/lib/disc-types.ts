export type DiscResponseValue = string | number | boolean;

export type DiscResponseInput = {
  questionId: string;
  value: DiscResponseValue;
};

export type DiscQuestionOption = {
  value: DiscResponseValue;
  label: string;
};

export type DiscQuestion = {
  id: string;
  prompt: string;
  options: DiscQuestionOption[];
};
