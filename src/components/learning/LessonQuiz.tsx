"use client";

import { useState } from "react";

type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
};

type LessonQuizProps = {
  questions: QuizQuestion[];
};

export default function LessonQuiz({ questions }: LessonQuizProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>(
    {}
  );

  const [submitted, setSubmitted] = useState(false);

  const score = questions.reduce((total, question, index) => {
    return selectedAnswers[index] === question.answer ? total + 1 : total;
  }, 0);

  const handleSubmit = () => {
    setSubmitted(true);
  };

  return (
    <div className="mt-8 rounded-2xl bg-[#071A3D] p-6 text-white">
      <h2 className="text-2xl font-bold text-[#D4AF37]">Quick Check</h2>

      <p className="mt-2 text-sm text-gray-300">
        Answer these short questions before moving forward.
      </p>

      <div className="mt-6 space-y-6">
        {questions.map((question, index) => (
          <div key={index} className="rounded-xl bg-[#0D2A5E] p-5">
            <h3 className="font-semibold">
              {index + 1}. {question.question}
            </h3>

            <div className="mt-4 space-y-3">
              {question.options.map((option) => {
                const isSelected = selectedAnswers[index] === option;
                const isCorrect = submitted && option === question.answer;
                const isWrong =
                  submitted && isSelected && option !== question.answer;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setSelectedAnswers({
                        ...selectedAnswers,
                        [index]: option,
                      })
                    }
                    className={`block w-full rounded-lg border p-3 text-left text-sm transition ${
                      isCorrect
                        ? "border-green-400 bg-green-500/20"
                        : isWrong
                        ? "border-red-400 bg-red-500/20"
                        : isSelected
                        ? "border-[#D4AF37] bg-[#D4AF37]/20"
                        : "border-white/20 bg-white/5"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        className="mt-6 w-full rounded-lg bg-[#D4AF37] py-3 font-semibold text-[#071A3D]"
      >
        Submit Quiz
      </button>

      {submitted && (
        <div className="mt-5 rounded-xl bg-white p-4 text-[#071A3D]">
          <p className="font-bold">
            Your Score: {score}/{questions.length}
          </p>
        </div>
      )}
    </div>
  );
}