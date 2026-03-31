/**
 * Schema-driven structured resume model used across parsing, master, and tailoring.
 */

export interface ContactInfo {
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  website?: string;
  other?: string[];
}

export interface ResumeHeader {
  fullName: string;
  contact: ContactInfo;
}

export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  bullets: string[];
  summary?: string;
}

export interface Education {
  id: string;
  institution: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  details?: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer?: string;
  date?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  technologies?: string[];
  bullets?: string[];
  link?: string;
}

export interface StructuredResume {
  header: ResumeHeader;
  summary: string;
  skills: string[];
  experience: WorkExperience[];
  education: Education[];
  certifications: Certification[];
  projects: Project[];
  keywords: string[];
}

export type TailoringIntensity = "LIGHT" | "MODERATE" | "AGGRESSIVE";

export interface JobPostingStructured {
  title: string;
  company: string;
  requiredQualifications: string[];
  preferredQualifications: string[];
  skills: string[];
  responsibilities: string[];
  keywords: string[];
}

export interface KeywordMatchAnalysisData {
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  matchScore: number;
}
