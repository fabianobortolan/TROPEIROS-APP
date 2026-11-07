import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import LearningModeSelector from '../components/eartraining/LearningModeSelector';
import LearnMode from '../components/eartraining/LearnMode';
import PracticeMode from '../components/eartraining/PracticeMode';
import CustomProgressionTrainer from '../components/eartraining/CustomProgressionTrainer';
import IntervalTrainer from '../components/eartraining/IntervalTrainer';
import ChordIdentifier from '../components/eartraining/ChordIdentifier';
import ChordComparison from '../components/eartraining/ChordComparison';
import SongFocusedPractice from '../components/eartraining/SongFocusedPractice';
import ScaleTrainer from '../components/eartraining/ScaleTrainer';
import KeyIdentifier from '../components/eartraining/KeyIdentifier';
import ImprovisationTrainer from '../components/eartraining/ImprovisationTrainer';

export default function HarmonicEarTraining() {
  const [songs, setSongs] = useState([]);
  const [progressions, setProgressions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(null); // null | 'aprender' | 'praticar' | 'desafio'

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [songsData, progsData] = await Promise.all([
        base44.fetchAllSongs(),
        base44.entities.Progression.list(),
      ]);
      setSongs(songsData);
      setProgressions(progsData);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A0E05] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#8B6F47] border-t-[#D4AF37] rounded-full animate-spin mx-auto" />
          <p className="text-stone-400">Carregando exercícios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A0E05] text-stone-100 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {!mode && (
          <LearningModeSelector onSelect={setMode} />
        )}
        {mode === 'aprender' && (
          <LearnMode onBack={() => setMode(null)} />
        )}
        {(mode === 'praticar' || mode === 'desafio') && (
          <PracticeMode
            songs={songs}
            progressions={progressions}
            challengeMode={mode === 'desafio'}
            onBack={() => setMode(null)}
          />
        )}
        {mode === 'intervalos' && (
          <IntervalTrainer onBack={() => setMode(null)} />
        )}
        {mode === 'cadencia' && (
          <CustomProgressionTrainer onBack={() => setMode(null)} />
        )}
        {mode === 'acordes' && (
          <ChordIdentifier onBack={() => setMode(null)} />
        )}
        {mode === 'comparar_acordes' && (
          <ChordComparison onBack={() => setMode(null)} />
        )}
        {mode === 'musica' && (
          <SongFocusedPractice
            songs={songs}
            progressions={progressions}
            onBack={() => setMode(null)}
          />
        )}
        {mode === 'escalas' && (
          <ScaleTrainer onBack={() => setMode(null)} />
        )}
        {mode === 'tom' && (
          <KeyIdentifier onBack={() => setMode(null)} />
        )}
        {mode === 'improvisacao' && (
          <ImprovisationTrainer onBack={() => setMode(null)} />
        )}
      </div>
    </div>
  );
}