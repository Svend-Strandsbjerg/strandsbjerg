import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(3, "Please provide a descriptive title."),
  description: z.string().min(10, "Add a short description for context."),
  location: z.string().optional(),
  dateOptions: z
    .array(z.string().datetime())
    .min(1, "At least one candidate date is required."),
});

export const voteSchema = z.object({
  eventId: z.string().cuid(),
  dateOptionIds: z.array(z.string().cuid()).min(1, "Select at least one date option."),
});
