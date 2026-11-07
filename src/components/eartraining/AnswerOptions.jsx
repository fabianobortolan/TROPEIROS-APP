import React from 'react';

export default function AnswerOptions({ options, onAnswer, answered, correctAnswer }) {
  return (
    <div className="space-y-3">
      <p className="text-stone-300 text-sm font-medium text-center">
        Qual é a progressão que você ouviu?
      </p>
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt, i) => {
          const isCorrect = answered && opt.value === correctAnswer;
          const isWrong = answered && opt.selected && opt.value !== correctAnswer;
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => onAnswer(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 font-medium text-sm ${
                isCorrect
                  ? 'bg-green-900/60 border-green-600 text-green-200'
                  : isWrong
                  ? 'bg-red-900/60 border-red-600 text-red-200 opacity-70'
                  : answered
                  ? 'bg-[#1A0E05] border-[#8B6F47]/20 text-stone-500 cursor-not-allowed'
                  : 'bg-[#2A1A0E] border-[#8B6F47]/40 text-stone-200 hover:bg-[#8B6F47]/20 hover:border-[#D4AF37] cursor-pointer'
              }`}
            >
              <span className="text-[#D4AF37] font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
              <span className="font-bold">{opt.progressionName}</span>
              <span className="text-stone-400 ml-2 text-xs">{opt.pattern}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}