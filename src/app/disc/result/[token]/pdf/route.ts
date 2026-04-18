import { NextResponse } from "next/server";

import { getSharedDiscResultAccess } from "@/lib/disc-result-access";
import { createDiscResultPdf } from "@/lib/disc-result-pdf";
import { getDiscReportTierForAssessmentVersionId } from "@/lib/disc-version-entitlements";
import { logServerEvent } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

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
    const firstPdfDownload = await prisma.assessmentResultShare.updateMany({
      where: {
        token,
        firstPdfDownloadedAt: null,
      },
      data: {
        firstPdfDownloadedAt: new Date(),
      },
    });

    if (firstPdfDownload.count > 0) {
      logServerEvent("info", "disc_beta_first_pdf_download", {
        resultToken: token,
        assessmentId: access.sharedResult.assessmentId,
        companyId: access.sharedResult.assessment.companyId,
      });
    }

    const reportTier = await getDiscReportTierForAssessmentVersionId(access.sharedResult.assessment.assessmentVersionId);
    const { pdfBytes } = createDiscResultPdf(access.sharedResult, { reportTier });

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="disc-result.pdf"',
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    logServerEvent("error", "disc_result_pdf_generation_failed", { resultToken: token, error });
    return new NextResponse("Unable to generate PDF right now.", { status: 500 });
  }
}
