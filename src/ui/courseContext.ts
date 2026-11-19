// The active course for the app chrome (top bar, sidebar): provided once in App, read where the course button sits.
import { createContext, useContext } from 'react';
import type { CourseId } from '../engine/courses';

export interface CourseCtx {
  active: CourseId;
  mine: CourseId[];
  open: () => void;
  /** 0.67: the Ear course's exam-prep mode (Settings.examPrep) and its switch. */
  examPrep: boolean;
  setExamPrep: (on: boolean) => void;
  /** SPEC-JAZZ-FOLD: the jazz pack is open in the active course (background, climbing, an instrument choice, focus). */
  jazzOn: boolean;
  /** SPEC-JAZZ-FOLD §4: the active course's jazz focus (Settings.jazzFocus) and its switch. */
  jazzFocus: boolean;
  setJazzFocus: (on: boolean) => void;
}
export const CourseContext = createContext<CourseCtx>({ active: 'ear', mine: ['ear'], open: () => {}, examPrep: false, setExamPrep: () => {}, jazzOn: false, jazzFocus: false, setJazzFocus: () => {} });
export const useCourse = () => useContext(CourseContext);
