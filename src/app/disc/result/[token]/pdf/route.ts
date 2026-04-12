import { NextResponse } from "next/server";

import { getSharedDiscResultAccess } from "@/lib/disc-result-access";
import { createDiscResultPdf } from "@/lib/disc-result-pdf";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const access = await getSharedDiscResultAccess(token);

  if (access.status === "missing") {
    return new NextResponse("Result not found.", { status: 404 });
  }

  if (access.status === "expired") {
    return new NextResponse("Result link expired.", { status: 410 });
  }

  try {
    const pdfBytes = createDiscResultPdf(access.sharedResult);

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="disc-result.pdf"',
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("[disc-result-pdf] generation_failed", { token, error });
    return new NextResponse("Unable to generate PDF right now.", { status: 500 });
  }
}
