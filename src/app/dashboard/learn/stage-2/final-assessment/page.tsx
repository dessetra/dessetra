import fs from "fs";
import path from "path";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FinalAssessment from "@/components/learning/FinalAssessment";
import Stage2AccessGuard from "@/components/learning/Stage2AccessGuard";

export default function FinalAssessmentPage() {
  const assessmentPath = path.join(
    process.cwd(),
    "src/content/free/stage-2-safe-participation/module-2-final-assessment/assessment.json"
  );

  const rewardPath = path.join(
    process.cwd(),
    "src/content/free/stage-2-safe-participation/module-2-final-assessment/reward.json"
  );

  const assessmentData = JSON.parse(
    fs.readFileSync(assessmentPath, "utf8")
  );

  const rewardData = JSON.parse(
    fs.readFileSync(rewardPath, "utf8")
  );

  const questions = assessmentData.questions.map(
    (question: {
      question: string;
      options: string[];
      correctAnswer: number;
    }) => ({
      question: question.question,
      options: question.options,
      answer: question.options[question.correctAnswer],
    })
  );

  return (
    <Stage2AccessGuard>
      <DashboardLayout>
        <div className="rounded-3xl bg-gradient-to-r from-[#04122D] to-[#0D2A5E] p-6 text-white shadow-lg md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
            Module 2 Assessment
          </p>

          <h1 className="mt-3 text-3xl font-bold md:text-4xl">
            Safe Participation Final Assessment
          </h1>

          <p className="mt-3 max-w-2xl text-gray-300">
            Pass this assessment to earn your Navigator Badge and 100 DP.
          </p>
        </div>

        <div className="mt-6">
          <FinalAssessment
            questions={questions}
            passingScore={assessmentData.passingScore}
            stageId="stage-2"
            dpReward={rewardData.dpReward}
            badge="Navigator Badge"
          />
        </div>
      </DashboardLayout>
    </Stage2AccessGuard>
  );
}