type LessonRewardProps = {
  xp: number;
  badge: string;
  message: string;
};

export default function LessonReward({
  xp,
  badge,
  message,
}: LessonRewardProps) {
  return (
    <div className="mt-8 overflow-hidden rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F5D76E] p-6 text-[#071A3D] shadow-lg">
      <p className="text-sm font-semibold uppercase tracking-[0.25em]">
        Reward Unlocked
      </p>

      <h2 className="mt-3 text-3xl font-bold">{badge}</h2>

      <p className="mt-3 text-sm leading-7">{message}</p>

      <div className="mt-5 inline-flex rounded-full bg-[#071A3D] px-5 py-2 font-bold text-white">
        +{xp} XP
      </div>
    </div>
  );
}