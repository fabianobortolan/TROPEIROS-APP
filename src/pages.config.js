/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Analyze from './pages/Analyze';
import Backup from './pages/Backup';
import ChordBuilder from './pages/ChordBuilder';
import Chords from './pages/Chords';
import DataProtection from './pages/DataProtection';
import Documentation from './pages/Documentation';
import ExerciseGenerator from './pages/ExerciseGenerator';
import Exercises from './pages/Exercises';
import HarmonicDictation from './pages/HarmonicDictation';
import HarmonicExplorer from './pages/HarmonicExplorer';
import Home from './pages/Home';
import InitializeApp from './pages/InitializeApp';
import Library from './pages/Library';
import MetronomePage from './pages/MetronomePage';
import MusicDictionary from './pages/MusicDictionary';
import PrepareCifra from './pages/PrepareCifra';
import PrepareCifraSecoesIndividuais from './pages/PrepareCifraSecoesIndividuais';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Profile from './pages/Profile';
import ProgressionGenerator from './pages/ProgressionGenerator';
import Progressions from './pages/Progressions';
import ReferenceLibrary from './pages/ReferenceLibrary';
import Reports from './pages/Reports';
import Rhythms from './pages/Rhythms';
import Scales from './pages/Scales';
import Setlists from './pages/Setlists';
import StudyPlans from './pages/StudyPlans';
import Styles from './pages/Styles';
import TemplateGuide from './pages/TemplateGuide';
import TheoryExercises from './pages/TheoryExercises';
import WorkflowGuide from './pages/WorkflowGuide';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analyze": Analyze,
    "Backup": Backup,
    "ChordBuilder": ChordBuilder,
    "Chords": Chords,
    "DataProtection": DataProtection,
    "Documentation": Documentation,
    "ExerciseGenerator": ExerciseGenerator,
    "Exercises": Exercises,
    "HarmonicDictation": HarmonicDictation,
    "HarmonicExplorer": HarmonicExplorer,
    "Home": Home,
    "InitializeApp": InitializeApp,
    "Library": Library,
    "MetronomePage": MetronomePage,
    "MusicDictionary": MusicDictionary,
    "PrepareCifra": PrepareCifra,
    "PrepareCifraSecoesIndividuais": PrepareCifraSecoesIndividuais,
    "PrivacyPolicy": PrivacyPolicy,
    "Profile": Profile,
    "ProgressionGenerator": ProgressionGenerator,
    "Progressions": Progressions,
    "ReferenceLibrary": ReferenceLibrary,
    "Reports": Reports,
    "Rhythms": Rhythms,
    "Scales": Scales,
    "Setlists": Setlists,
    "StudyPlans": StudyPlans,
    "Styles": Styles,
    "TemplateGuide": TemplateGuide,
    "TheoryExercises": TheoryExercises,
    "WorkflowGuide": WorkflowGuide,
}

export const pagesConfig = {
    mainPage: "Library",
    Pages: PAGES,
    Layout: __Layout,
};