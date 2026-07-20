import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { AuthorizationError, requireRole } from "@/lib/auth-context";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireRole(UserRole.ADMIN);
    const { id } = await params;
    const evaluation = await getPrisma().candidateEvaluation.findFirst({
      where: { id, candidate: { organizationId: context.organizationId } },
      select: {
        id: true,
        source: true,
        narrativeSource: true,
        semanticAssessmentStatus: true,
        semanticAssessmentReason: true,
        narrativeStatus: true,
        narrativeReason: true,
        modelName: true,
        scoringVersion: true,
        promptVersion: true,
      },
    });

    if (!evaluation) {
      return NextResponse.json({ error: "Evaluation not found in the active workspace." }, { status: 404 });
    }

    return NextResponse.json({
      evaluationId: evaluation.id,
      scoringMode: evaluation.source,
      narrativeSource: evaluation.narrativeSource,
      semanticAssessmentStatus: evaluation.semanticAssessmentStatus,
      semanticAssessmentReason: evaluation.semanticAssessmentReason,
      narrativeStatus: evaluation.narrativeStatus,
      narrativeReason: evaluation.narrativeReason,
      model: evaluation.modelName,
      scoringVersion: evaluation.scoringVersion,
      promptVersion: evaluation.promptVersion,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    }
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }
}
