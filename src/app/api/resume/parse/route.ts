import { NextResponse } from "next/server";
import { extractText } from "unpdf";
import { requireRole, hiringManagerRoles } from "@/lib/auth-context";
import { createOperationId, logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const operationId = createOperationId();
  let actor: { userId: string; organizationId: string } | undefined;
  try {
    const context = await requireRole(...hiringManagerRoles);
    actor = context;
    const formData = await request.formData();
    const file = formData.get("resume");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a PDF or TXT resume to continue." }, { status: 400 });
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Resume files must be between 1 byte and 4 MB." }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || fileName.endsWith(".pdf");
    const isText = file.type === "text/plain" || fileName.endsWith(".txt");

    if (!isPdf && !isText) {
      return NextResponse.json({ error: "Only PDF and TXT resumes are supported." }, { status: 415 });
    }

    const text = isPdf
      ? (await extractText(new Uint8Array(await file.arrayBuffer()), { mergePages: true })).text
      : await file.text();
    const cleanedText = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").trim();

    if (cleanedText.length < 20) {
      return NextResponse.json(
        { error: "We could not extract enough text from this file. Please paste the resume text manually." },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { text: cleanedText, fileName: file.name },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logger.warn("resume_parse_failed", {
      operationId,
      userId: actor?.userId,
      organizationId: actor?.organizationId,
      resourceType: "resume",
      reason: error instanceof Error ? error.name : "unknown",
    });
    if (error instanceof Error && (error.message.includes("Sign in") || error.message.includes("permission"))) {
      return NextResponse.json({ error: "Authentication is required to parse resumes." }, { status: 401 });
    }
    return NextResponse.json(
      { error: "We could not read this resume. Please paste the resume text manually." },
      { status: 422 },
    );
  }
}
