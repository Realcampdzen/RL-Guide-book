import { useCallback, useState } from 'react';
import type { AdditionalMaterial, Badge, Category, RegistrationFormData, View } from '../types/guide';

type UseNavigationArgs = {
  categories: Category[];
};

export const useNavigation = ({ categories }: UseNavigationArgs) => {
  const [currentView, setCurrentView] = useState<View>('intro');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedAdditionalMaterial, setSelectedAdditionalMaterial] = useState<AdditionalMaterial | null>(null);
  const [formData, setFormData] = useState<RegistrationFormData>({
    childName: '',
    parentName: '',
    phone: '',
    email: '',
    childAge: '',
    specialRequests: '',
  });
  const [categoryBackTarget, setCategoryBackTarget] = useState<View>('categories');

  const handleIntroClick = useCallback(() => {
    console.log('App: Intro clicked - switching to categories view');
    setCurrentView('categories');
    setSelectedCategory(null);
    setSelectedBadge(null);
    setSelectedLevel('');
  }, []);

  const handleCategoryClick = useCallback((category: Category, options?: { origin?: View }) => {
    const origin = options?.origin || 'categories';
    console.log('Category clicked:', category.title);
    setSelectedCategory(category);
    setCurrentView('category');
    setSelectedBadge(null);
    setSelectedLevel('');
    setCategoryBackTarget(origin);
    console.log('currentView set:', 'category');
  }, []);

  const handleBadgeClick = useCallback((badge: Badge) => {
    console.log('App: Badge clicked:', badge.title);
    const cat = categories.find((c) => c.id === badge.category_id);
    if (cat) setSelectedCategory(cat);
    setSelectedBadge(badge);
    setCurrentView('badge');
    setSelectedLevel('');
  }, [categories]);

  const handleLevelClick = useCallback((level: string) => {
    console.log('App: Level clicked:', level);
    setSelectedLevel(level);
    setCurrentView('badge-level');
  }, []);

  const handleTelegramContact = useCallback(() => {
    setCurrentView('registration-form');
  }, []);

  const handleFormInputChange = useCallback((field: keyof RegistrationFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleBackToAboutCamp = useCallback(() => {
    setCurrentView('about-camp');
    setCategoryBackTarget('categories');
  }, []);

  const handleBackToCategories = useCallback(() => {
    console.log('App: Back to categories clicked');
    setCurrentView('categories');
    setSelectedCategory(null);
    setSelectedBadge(null);
    setSelectedLevel('');
    setCategoryBackTarget('categories');
  }, []);

  const handleBackToBadge = useCallback(() => {
    console.log('App: Back to badge clicked');
    setCurrentView('badge');
    setSelectedLevel('');
  }, []);

  const handleBackToIntro = useCallback(() => {
    // Проверяем, пришли ли мы с HTML страницы
    const referrer = document.referrer;
    const isFromHTML = referrer.includes('bluenest.html') || referrer.includes('categories.html');
    
    if (isFromHTML) {
      // Возвращаем на стартовую HTML страницу
      window.location.href = 'bluenest.html';
    } else {
      // Внутренняя навигация React приложения
      setCurrentView('intro');
      setSelectedCategory(null);
      setSelectedBadge(null);
      setSelectedLevel('');
    }
  }, [setCurrentView]);

  const handleLogoClick = useCallback(() => {
    setCurrentView('about-camp');
  }, []);

  const handleBackToCategory = useCallback(() => {
    console.log('App: Back to category clicked');
    setCurrentView('category');
    setSelectedBadge(null);
    setSelectedLevel('');
    setSelectedAdditionalMaterial(null);
  }, []);

  const handleBackToCategoryFromIntroduction = useCallback(() => {
    console.log('App: Back to category from introduction clicked');
    setCurrentView('category');
  }, []);

  const handleBackToCategoryFromAdditional = useCallback(() => {
    console.log('App: Back to category from additional material clicked');
    setCurrentView('category');
    setSelectedAdditionalMaterial(null);
  }, []);

  return {
    currentView,
    selectedCategory,
    selectedBadge,
    selectedLevel,
    selectedAdditionalMaterial,
    formData,
    setCurrentView,
    setSelectedCategory,
    setSelectedBadge,
    setSelectedLevel,
    setSelectedAdditionalMaterial,
    setFormData,
    handleIntroClick,
    handleCategoryClick,
    handleBadgeClick,
    handleLevelClick,
    handleTelegramContact,
    handleFormInputChange,
    handleBackToAboutCamp,
    handleBackToCategories,
    handleBackToBadge,
    handleBackToIntro,
    handleLogoClick,
    handleBackToCategory,
    handleBackToCategoryFromIntroduction,
    handleBackToCategoryFromAdditional,
    categoryBackTarget,
  };
};
