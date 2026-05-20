export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "pm-projects";
const CURRENT_PROJECT_KEY = "pm-current-project";

const PROJECT_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];

function pickColor(index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
}

export function getAllProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function getProject(id: string): Project | null {
  return getAllProjects().find((p) => p.id === id) || null;
}

export function createProject(name: string, description: string = ""): Project {
  const projects = getAllProjects();
  const project: Project = {
    id: `proj-${Date.now()}`,
    name,
    description,
    color: pickColor(projects.length),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projects.push(project);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return project;
}

export function updateProject(
  id: string,
  updates: Partial<Pick<Project, "name" | "description" | "color">>
): Project | null {
  const projects = getAllProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  projects[idx] = {
    ...projects[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return projects[idx];
}

export function deleteProject(id: string): void {
  const projects = getAllProjects().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  // Clear current project if it was deleted
  if (getCurrentProjectId() === id) {
    setCurrentProjectId(null);
  }
}

export function getCurrentProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CURRENT_PROJECT_KEY);
}

export function setCurrentProjectId(id: string | null): void {
  if (id === null) {
    localStorage.removeItem(CURRENT_PROJECT_KEY);
  } else {
    localStorage.setItem(CURRENT_PROJECT_KEY, id);
  }
}
