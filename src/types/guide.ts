export type View =
  | 'intro'
  | 'categories'
  | 'category'
  | 'badge'
  | 'badge-level'
  | 'introduction'
  | 'additional-material'
  | 'about-camp'
  | 'registration-form';

export interface Category {
  id: string;
  title: string;
  emoji?: string;
  badge_count: number;
  expected_badges: number;
  description?: string;
  introduction?: {
    markdown: string;
    html: string;
    has_introduction: boolean;
  };
  additional_materials?: {
    checklists?: {
      [key: string]: {
        title: string;
        markdown: string;
        html: string;
      };
    };
    methodology?: {
      [key: string]: {
        title: string;
        markdown: string;
        html: string;
      };
    };
  };
}

export interface Badge {
  id: string;
  title: string;
  emoji: string;
  category_id: string;
  level: string;
  description?: string;
  criteria?: string;
  confirmation?: string;
  nameExplanation?: string;
  skillTips?: string;
  examples?: string;
  importance?: string;
  philosophy?: string;
  howToBecome?: string;
}

export interface AdditionalMaterial {
  type: 'checklists' | 'methodology';
  key: string;
  title: string;
  content: string;
}

export interface RegistrationFormData {
  childName: string;
  parentName: string;
  phone: string;
  email: string;
  childAge: string;
  specialRequests: string;
}
