
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  photoURL: string | null;
  name?: string;
  profile_pic?: string;
}

export interface CareerRecommendation {
  title: string;
  description?: string; // Extended for advanced view
  imageTag: string;
  imageUrl?: string; 
  roadmap?: RoadmapStep[];
}

export interface QuizRecommendation {
  title: string;
  description: string;
  imagePrompt: string; // For generating the image
  imageUrl?: string;   // The generated URL
}

export interface CareerDetails {
  title: string;
  description: string;
  skills: string[];
  roadmap?: RoadmapStep[];
}

export interface RoadmapStep {
  title: string;
  duration: string;
  description: string;
}

export interface Job {
  jobTitle: string;
  companyName: string;
}

export interface CareerFormData {
  fullName: string;
  classLevel: string;
  stream: string;
  marks: number;
}

export interface AdvancedFormData {
  name: string;
  classLevel: string;
  stream: string;
  marks: string;
  interests: string[];
  strengths: string[];
  environment: string[];
  goal: string;
}

export interface SkillDetail {
  name: string;
  explanation: string;
}

export interface InterviewQuestion {
  question: string;
  answer_explanation: string;
}

export interface Session {
  id: string;
  title: string;
  description: string;
  startTime: any; // Firestore Timestamp or string
  price: number | string;
  discounted_price: number | string;
  src_img?: string;
  thumbnailColor?: string;
  class_type?: string;
  status?: string;
  learn?: string[];
  attend_who?: string[];
  mentor?: string;
  mentor_img?: string;
  mentor_usp?: string;
  mentor_desc?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface QuizResult {
  score: number;
  total: number;
  percentage: number;
  accuracy: number;
  correct: number;
  incorrect: number;
  skipped: number;
  timeTaken: string; // "X min Y sec"
}

export interface Blog {
  id: string;
  title: string;
  subhead?: string;
  content: string; // HTML content from rich text editor
  featuredImage?: string;
  authorId: string;
  authorName: string;
  createdAt: any; // Firestore Timestamp
  updatedAt?: any;
}

export interface Author {
  id: string; // User UID
  email: string;
  name: string;
  addedAt: any;
}
