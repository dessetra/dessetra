import fs from "fs";
import path from "path";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FinalAssessment from "@/components/learning/FinalAssessment";
import PremiumAccessGuard from "@/components/learning/PremiumAccessGuard";

export default function FinalAssessmentPage() {
  const assessmentPath = path.join(
    process.cwd(),
    "src/content/free/stage-3-defi-and-passive-income/module-3-final-assessment/assessment.json"
  );

  const rewardPath = path.join(
    process.cwd(),
    "src/content/free/stage-3-defi-and-passive-income/module-3-final-assessment/reward.json"
  );

  const assessmentData = JSON.parse(fs.readFileSync(assessmentPath, "utf8"));
  const rewardData = JSON.parse(fs.readFileSync(rewardPath, "utf8"));

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
    <DashboardLayout>
      <PremiumAccessGuard requiredPlan="premium_access">
        <div className="rounded-3xl bg-gradient-to-r from-[#04122D] to-[#0D2A5E] p-6 text-white shadow-lg md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
            Module 3 Assessment
          </p>

          <h1 className="mt-3 text-3xl font-bold md:text-4xl">
            DeFi & Passive Income Final Assessment
          </h1>

          <p className="mt-3 max-w-2xl text-gray-300">
            Pass this assessment to earn your Builder Badge and 100 DP.
          </p>
        </div>

        <div className="mt-6">
          <FinalAssessment
            questions={questions}
            passingScore={assessmentData.passingScore}
            stageId="stage-3"
            dpReward={rewardData.dpReward}
            badge="Builder Badge"
          />
        </div>
      </PremiumAccessGuard>
    </DashboardLayout>
  );
}