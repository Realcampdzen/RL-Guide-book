import React, { useEffect } from 'react';
import { useUserProgress } from '../hooks/useUserProgress';

export const PathFavToast: React.FC = () => {
  const { pathFavToast, setPathFavToast } = useUserProgress();

  useEffect(() => {
    if (!pathFavToast) return;
    const id = window.setTimeout(() => setPathFavToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [pathFavToast, setPathFavToast]);

  if (!pathFavToast) return null;

  let message: string;
  switch (pathFavToast.type) {
    case 'path_added':
      message = `Значок в пути. Осталось мест в маршруте: ${pathFavToast.pathSlotsLeft}`;
      break;
    case 'path_limit':
      message = 'В путь помещается только 10 значков. Убери один в ЛК — и можно добавить новый.';
      break;
    case 'fav_added':
      message = `Добавлено в избранное. Осталось мест: ${pathFavToast.favSlotsLeft}`;
      break;
    case 'fav_limit':
      message = 'В избранном только 10 значков. Убери один, чтобы добавить новый.';
      break;
    case 'squad_added':
      message = `Добавлено в Идеи отряда. Осталось мест: ${pathFavToast.squadSlotsLeft}`;
      break;
    case 'squad_limit':
      message = 'В Идеях отряда только 10 идей. Убери одну, чтобы добавить новую.';
      break;
    default:
      return null;
  }

  return (
    <div className="path-fav-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
};
