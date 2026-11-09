// The active course for the app chrome (top bar, sidebar): provided once in App, read where the course button sits.
import { createContext, useContext } from 'react';
import type { CourseId } from '../engine/courses';

export interface CourseCtx {
  active: CourseId;
  mine: CourseId[];
  open: () => void;
}
export const CourseContext = createContext<CourseCtx>({ active: 'ear', mine: ['ear'], open: () => {} });
export const useCourse = () => useContext(CourseContext);
