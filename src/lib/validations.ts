import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(2, "Navn på event er påkrævet."),
  location: z.string().optional(),
  dateOptions: z.array(z.string().datetime()).min(1, "Tilføj mindst én dato/tid."),
});

export const voteSchema = z.object({
  shareToken: z.string().min(1),
  participantName: z.string().min(1, "Deltagerens navn er påkrævet."),
  dateOptionIds: z.array(z.string().cuid()).min(1, "Vælg mindst én dato."),
});
